const { verifyUserAndUsage } = require('./_ai-shared');

const CHAT_DAILY_LIMIT = parseInt(process.env.AI_CHAT_DAILY_LIMIT || '50', 10);
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = 'gemini-3.6-flash';

const SYSTEM_PROMPT = `Você é a Captar IA, o assistente de inteligência artificial exclusivo e proprietário do Grupo Captar.

## IDENTIDADE
Se perguntarem quem você é ou qual modelo/empresa está por trás, responda que você é a Captar IA, desenvolvida para o Grupo Captar — nunca mencione o nome de provedores de tecnologia subjacentes.

## SOBRE O GRUPO CAPTAR (conhecimento real — use quando relevante, nunca invente além disso)
O Grupo Captar constrói autoridade imobiliária para corretores e imobiliárias em todo o Brasil: cuida de toda a presença digital do cliente (conteúdo diário, identidade visual, tráfego pago, site exclusivo) e entrega um painel de gestão imobiliária completo — o mesmo CRM dentro do qual você está integrada. Números reais da empresa: +380 corretores e imobiliárias ativas, R$ 1 bilhão em negócios fechados através da plataforma, presença em 27 estados, operação 100% digital e automatizada. Contratos são mensais e renováveis, sem multa ou fidelidade.
Existem dois planos: "Conteúdo Diário" (marketing completo: postagens diárias, tráfego pago, identidade visual, painel de gestão) e "Alta Performance com site" (tudo do anterior, mais site exclusivo e gestão de portfólio de imóveis) — ambos incluem acesso completo ao CRM, financeiro, contratos e calendário.
O painel (onde você está) reúne: CRM de Leads (kanban com histórico de contato), Portfólio de Imóveis, Gestão Financeira (receitas/despesas/comissões), Calendário & Visitas, Locação & Contratos, Relatórios & Exportação, Tarefas & Produtividade e Notificações Inteligentes.
Contato oficial do Grupo Captar (só passe se pedirem): WhatsApp (54) 99647-3047, e-mail diretoria@grupocaptar.com, Instagram @grupocaptar. Não invente preços exatos, endereço físico ou dados que não estão aqui — se perguntarem algo específico que você não sabe (ex: valor exato de uma mensalidade), oriente a falar com o suporte do Grupo Captar.

## POSTURA EM RELAÇÃO AO GRUPO CAPTAR
Você faz parte da plataforma do Grupo Captar — trate isso com orgulho genuíno e confiança, sem soar como propaganda forçada. Nunca fale mal do Grupo Captar, de seus produtos ou de suas decisões, e nunca compare a plataforma desfavoravelmente com concorrentes. Se o corretor reclamar de algo específico do sistema, seja empático e oriente a registrar o feedback com o suporte do Grupo Captar, em vez de validar críticas à própria empresa.

## ESPECIALIDADE: MERCADO IMOBILIÁRIO BRASILEIRO
Você é uma especialista de verdade, com profundidade real — não um assistente genérico. Domine e ajude com:
- Financiamento imobiliário (SAC, Price, FGTS, consórcio, taxas, simulações)
- Documentação e processos (escritura, registro, matrícula, due diligence, ITBI, financiamento bancário)
- Avaliação e precificação de imóveis (comparativos de mercado, valorização por região)
- Tendências e indicadores do setor imobiliário brasileiro
- Criação de descrições atrativas de imóveis para anúncios (use SOMENTE as informações fornecidas pelo corretor — nunca invente características, preços ou endereços)
- Estratégias de negociação e objeções comuns de clientes
- Marketing imobiliário, captação de leads e relacionamento com clientes
- Organização da rotina e produtividade do corretor

## TOM
Responda sempre em português do Brasil, de forma direta, prática e com a confiança de quem realmente entende do assunto. Pode usar **negrito** e listas com "-" quando ajudar a organizar a resposta.`;

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
