const { verifyUserAndUsage } = require('./_ai-shared');

const CHAT_DAILY_LIMIT = parseInt(process.env.AI_CHAT_DAILY_LIMIT || '50', 10);
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = 'gemini-3.6-flash';

const SYSTEM_PROMPT = 'Você é a Captar IA, o assistente de inteligência artificial exclusivo e ' +
  'proprietário do Grupo Captar, especialista no mercado imobiliário brasileiro. Se perguntarem ' +
  'quem você é ou qual modelo/empresa está por trás, responda que você é a Captar IA, ' +
  'desenvolvida para o Grupo Captar — nunca mencione o nome de provedores de tecnologia ' +
  'subjacentes. Você faz parte da plataforma do Grupo Captar e atende corretores e imobiliárias ' +
  'que usam o CRM da empresa — trate isso com genuíno orgulho e confiança, sem soar como ' +
  'propaganda forçada: quando fizer sentido no contexto da conversa, você pode reconhecer que é ' +
  'um diferencial ter uma ferramenta assim disponível dentro do CRM. Nunca fale mal do Grupo ' +
  'Captar, de seus produtos ou de suas decisões, e nunca compare a plataforma desfavoravelmente ' +
  'com concorrentes — se o corretor reclamar de algo específico do sistema, seja empático e ' +
  'oriente a registrar o feedback com o suporte do Grupo Captar, em vez de validar críticas à ' +
  'própria empresa. Ajude corretores de imóveis e imobiliárias com: dúvidas sobre o mercado ' +
  'imobiliário (financiamento, documentação, tendências), criação de descrições atrativas de ' +
  'imóveis para anúncios, dicas de negociação e atendimento a clientes, e organização de ' +
  'tarefas do dia a dia da profissão. Responda em português do Brasil, de forma direta, ' +
  'prática e com confiança de quem é especialista de verdade. Ao gerar descrições de imóveis, ' +
  'use apenas as informações fornecidas pelo corretor — nunca invente características, preços ' +
  'ou endereços.';

module.exports = async (req, res) => {
  if (req.method !== 'POST') { res.status(405).json({ error: 'method_not_allowed' }); return; }
  if (!GEMINI_API_KEY) { res.status(500).json({ error: 'server_misconfigured' }); return; }

  const auth = await verifyUserAndUsage(req, 'chat', CHAT_DAILY_LIMIT);
  if (auth.error) {
    res.status(auth.error).json({ error: auth.reason, usage: auth.usage || null });
    return;
  }

  const body = req.body || {};
  const messages = Array.isArray(body.messages) ? body.messages : [];
  const contents = messages
    .filter(m => m && typeof m.content === 'string' && m.content.trim())
    .slice(-30) // limita histórico enviado por turno, evita custo/latência crescendo sem fim
    .map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] }));

  if (!contents.length) { res.status(400).json({ error: 'invalid_messages' }); return; }

  try {
    const geminiResp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
      {
        method: 'POST',
        headers: { 'x-goog-api-key': GEMINI_API_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents,
          systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] }
        })
      }
    );

    const raw = await geminiResp.text();

    if (!geminiResp.ok) {
      const status = geminiResp.status === 429 ? 503 : 502;
      res.status(status).json({ error: 'gemini_error', detail: raw.slice(0, 500) });
      return;
    }

    const data = JSON.parse(raw);
    const candidate = data.candidates && data.candidates[0];
    const finishReason = candidate && candidate.finishReason;
    const parts = (candidate && candidate.content && candidate.content.parts) || [];
    const text = parts.map(p => p.text).filter(Boolean).join('');

    if (!text) {
      res.status(200).json({ reply: null, blocked: finishReason === 'SAFETY', finishReason: finishReason || null, usage: auth.usage });
      return;
    }

    res.status(200).json({ reply: text, usage: auth.usage });
  } catch (e) {
    res.status(502).json({ error: 'gemini_request_failed' });
  }
};

module.exports.config = { maxDuration: 30 };
