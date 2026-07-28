const crypto = require('crypto');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = 'gemini-3.6-flash';
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const DAILY_LIMIT = parseInt(process.env.LANDING_CHAT_DAILY_LIMIT || '20', 10);
const MAX_MESSAGE_LEN = 800;
const IP_HASH_SALT = 'captar-landing-chat-v1';

const SYSTEM_PROMPT = `Você é a Captar IA, a assistente virtual do site do Grupo Captar — conversando agora com um VISITANTE do site (uma pessoa que ainda não é cliente), não com um cliente já cadastrado no painel.

## SEU OBJETIVO
Tirar dúvidas sobre os serviços do Grupo Captar de forma clara, simpática e confiante, e conduzir o visitante para fechar um dos planos. Você não fecha contrato nem processa pagamento — seu papel é esclarecer dúvidas e, sempre que fizer sentido, convidar a pessoa a continuar a conversa com o time comercial no WhatsApp, onde a venda de verdade acontece.

## SOBRE O GRUPO CAPTAR (conhecimento real — use isso, nunca invente além disso)
O Grupo Captar constrói autoridade imobiliária para corretores e imobiliárias em todo o Brasil: cuida de toda a presença digital do cliente (conteúdo diário, identidade visual, tráfego pago, site exclusivo) e entrega um painel de gestão imobiliária completo com a Captar IA integrada — chat especialista em mercado imobiliário e gerador/editor de imagens com inteligência artificial para anúncios. Números reais: +380 corretores e imobiliárias ativas, R$ 1 bilhão em negócios fechados através da plataforma, presença em 27 estados, operação 100% digital e automatizada.
Existem dois planos: "Conteúdo Diário" (marketing completo: postagens diárias, tráfego pago, identidade visual, painel de gestão + Captar IA) e "Alta Performance com site" (tudo do anterior, mais site exclusivo e gestão de portfólio de imóveis). Contratos são mensais e renováveis, sem multa ou fidelidade.
Contato oficial: WhatsApp (54) 99647-3047. Não invente valores exatos de mensalidade, promoções ou descontos que não foram informados aqui — se perguntarem preço exato, diga que os valores variam conforme a operação e que o time comercial passa a tabela certinha no WhatsApp.

## POSTURA
Fale sempre bem do Grupo Captar, com orgulho genuíno, sem soar como propaganda forçada. Nunca fale mal da empresa nem compare desfavoravelmente com concorrentes.

## COMO CONDUZIR A CONVERSA
- Responda a dúvida da pessoa de forma direta e útil primeiro.
- Sempre que fizer sentido — principalmente se a pessoa demonstrar interesse, perguntar preço, ou perguntar como contratar — conclua convidando a continuar no WhatsApp (ex: "Quer que eu te conecte com nosso time no WhatsApp pra fechar os detalhes?"). Não force isso em toda resposta trivial, mas nunca deixe passar uma oportunidade clara de avançar a conversa.

## LIMITES
Se perguntarem algo totalmente fora do escopo (não relacionado ao Grupo Captar, marketing imobiliário ou à Captar IA), redirecione com educação de volta pro assunto.

## FORMATAÇÃO
Use no máximo **negrito** e listas simples com "-" quando ajudar — nunca títulos markdown, tabelas ou links markdown. Respostas curtas: é um chat de site, não um relatório.

## TOM
Português do Brasil, animado, consultivo e confiante — como um vendedor experiente e simpático, nunca robótico.`;

function getClientIp(req) {
  // Vercel's edge SEMPRE anexa o IP real da conexão como o ÚLTIMO valor de
  // x-forwarded-for — qualquer coisa antes disso foi declarada pelo próprio
  // chamador e não é confiável. Pegar o primeiro valor (como estava antes)
  // deixava o limite diário totalmente burlável: bastava mandar um
  // X-Forwarded-For falso e diferente em cada request pra sempre cair num
  // hash de IP novo, sem nunca bater o limite.
  const fwd = req.headers['x-forwarded-for'];
  if (fwd) {
    const parts = String(fwd).split(',').map(s => s.trim()).filter(Boolean);
    if (parts.length) return parts[parts.length - 1];
  }
  const realIp = req.headers['x-real-ip'];
  if (realIp) return String(realIp).trim();
  return (req.socket && req.socket.remoteAddress) || 'unknown';
}

function hashIp(ip) {
  return crypto.createHash('sha256').update(IP_HASH_SALT + ip).digest('hex');
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') { res.status(405).json({ error: 'method_not_allowed' }); return; }
  if (!GEMINI_API_KEY || !SUPABASE_URL || !SUPABASE_ANON_KEY) { res.status(500).json({ error: 'server_misconfigured' }); return; }

  const ipHash = hashIp(getClientIp(req));

  let usage;
  try {
    const rpcResp = await fetch(`${SUPABASE_URL}/rest/v1/rpc/landing_chat_check_and_increment`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ p_ip_hash: ipHash, p_daily_limit: DAILY_LIMIT })
    });
    const bodyText = await rpcResp.text();
    if (!rpcResp.ok) {
      console.error('landing_chat usage_check_failed', rpcResp.status, bodyText.slice(0, 1000));
      res.status(500).json({ error: 'usage_check_failed' });
      return;
    }
    const rows = JSON.parse(bodyText);
    usage = Array.isArray(rows) ? rows[0] : rows;
  } catch (e) {
    res.status(500).json({ error: 'usage_check_failed' });
    return;
  }

  if (!usage || usage.allowed !== true) {
    res.status(429).json({ error: 'daily_limit_reached', usage });
    return;
  }

  const body = req.body || {};
  const messages = Array.isArray(body.messages) ? body.messages : [];
  const contents = messages
    .filter(m => m && typeof m.content === 'string' && m.content.trim() && m.content.length <= MAX_MESSAGE_LEN)
    .slice(-16) // limita histórico enviado por turno, evita custo/latência crescendo sem fim
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
      console.error('gemini_error(landing-chat)', geminiResp.status, raw.slice(0, 1000));
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
      res.status(200).json({ reply: null, blocked: finishReason === 'SAFETY', finishReason: finishReason || null, usage });
      return;
    }

    res.status(200).json({ reply: text, usage });
  } catch (e) {
    res.status(502).json({ error: 'gemini_request_failed' });
  }
};

module.exports.config = { maxDuration: 30 };
