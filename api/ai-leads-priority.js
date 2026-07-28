const { verifyUserAndUsage } = require('./_ai-shared');

const LEADS_DAILY_LIMIT = parseInt(process.env.AI_LEADS_DAILY_LIMIT || '15', 10);
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = 'gemini-3.6-flash';
const MAX_LEADS = 80;
const MAX_FIELD_LEN = 200;

const SYSTEM_PROMPT = `Você é um motor de priorização de leads para corretores de imóveis do Grupo Captar.

Vai receber uma lista de leads em JSON, cada um com: id, nome, tipo (interesse/perfil), valor (faixa de negócio), coluna (etapa do funil: novo, contato, negociacao, fechado, perdido), dias (dias desde o último contato), obs (observações livres do corretor, pode estar vazio).

Sua tarefa: avaliar cada lead e retornar um score de 0 a 100 de quão prioritário é o corretor entrar em contato AGORA, um rótulo ("Quente", "Morno" ou "Frio") e um motivo curto (máximo 12 palavras, em português) explicando o porquê.

Critérios que devem pesar na sua avaliação:
- Leads em etapas mais avançadas do funil (negociacao) tendem a ser mais prioritários que leads em "novo".
- Muitos dias sem contato é um sinal de risco (lead esfriando) — mas também pode ser oportunidade de reativação, dependendo da etapa.
- Leads em "fechado" ou "perdido" devem ter prioridade baixa (já não são ação imediata).
- Observações que mencionem urgência, prazo, ou interesse forte aumentam a prioridade.
- Faixas de valor mais altas merecem atenção, mas não devem sozinhas definir a prioridade.

Responda SOMENTE com um array JSON válido, sem nenhum texto antes ou depois, no formato exato:
[{"id":"...","score":0,"label":"Quente","motivo":"..."}]

Inclua um item pra cada lead recebido, na mesma ordem, usando o id exatamente como recebido.`;

module.exports = async (req, res) => {
  if (req.method !== 'POST') { res.status(405).json({ error: 'method_not_allowed' }); return; }
  if (!GEMINI_API_KEY) { res.status(500).json({ error: 'server_misconfigured' }); return; }

  const auth = await verifyUserAndUsage(req, 'leads', LEADS_DAILY_LIMIT);
  if (auth.error) {
    res.status(auth.error).json({ error: auth.reason, usage: auth.usage || null });
    return;
  }

  const body = req.body || {};
  const leadsIn = Array.isArray(body.leads) ? body.leads : [];
  if (!leadsIn.length) { res.status(400).json({ error: 'invalid_leads' }); return; }

  const trim = (v) => (typeof v === 'string' ? v.slice(0, MAX_FIELD_LEN) : (v == null ? '' : String(v).slice(0, MAX_FIELD_LEN)));
  const leads = leadsIn.slice(0, MAX_LEADS)
    .filter(l => l && l.id != null)
    .map(l => ({
      id: String(l.id),
      nome: trim(l.nome),
      tipo: trim(l.tipo),
      valor: trim(l.valor),
      coluna: trim(l.coluna),
      dias: Number.isFinite(l.dias) ? l.dias : 0,
      obs: trim(l.obs)
    }));

  if (!leads.length) { res.status(400).json({ error: 'invalid_leads' }); return; }

  try {
    const geminiResp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
      {
        method: 'POST',
        headers: { 'x-goog-api-key': GEMINI_API_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: JSON.stringify(leads) }] }],
          systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
          generationConfig: { responseMimeType: 'application/json' }
        })
      }
    );

    const raw = await geminiResp.text();

    if (!geminiResp.ok) {
      console.error('gemini_error(ai-leads-priority)', geminiResp.status, raw.slice(0, 1000));
      const status = geminiResp.status === 429 ? 503 : 502;
      res.status(status).json({ error: 'gemini_error' });
      return;
    }

    const data = JSON.parse(raw);
    const candidate = data.candidates && data.candidates[0];
    const finishReason = candidate && candidate.finishReason;
    const parts = (candidate && candidate.content && candidate.content.parts) || [];
    const text = parts.map(p => p.text).filter(Boolean).join('');

    if (!text) {
      res.status(200).json({ results: null, blocked: finishReason === 'SAFETY', finishReason: finishReason || null, usage: auth.usage });
      return;
    }

    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch (e) {
      console.error('ai-leads-priority: resposta não era JSON válido', text.slice(0, 500));
      res.status(502).json({ error: 'invalid_model_output' });
      return;
    }
    if (!Array.isArray(parsed)) { res.status(502).json({ error: 'invalid_model_output' }); return; }

    const validIds = new Set(leads.map(l => l.id));
    const validLabels = new Set(['Quente', 'Morno', 'Frio']);
    const results = parsed
      .filter(r => r && validIds.has(String(r.id)))
      .map(r => ({
        id: String(r.id),
        score: Math.max(0, Math.min(100, Number.isFinite(r.score) ? Math.round(r.score) : 0)),
        label: validLabels.has(r.label) ? r.label : 'Morno',
        motivo: trim(r.motivo)
      }));

    res.status(200).json({ results, usage: auth.usage });
  } catch (e) {
    res.status(502).json({ error: 'gemini_request_failed' });
  }
};

module.exports.config = { maxDuration: 30 };
