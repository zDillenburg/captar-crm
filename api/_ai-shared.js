const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

// Verifica o token do usuário (Bearer) direto contra o Supabase Auth, e checa/incrementa
// o limite diário via RPC — sem nenhuma service-role key, só o token do próprio usuário.
// Isso garante que o mesmo RLS que protege leads/imoveis/etc protege o uso da IA.
async function verifyUserAndUsage(req, kind, dailyLimit) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return { error: 500, reason: 'server_misconfigured' };
  }

  const authHeader = req.headers['authorization'] || req.headers['Authorization'] || '';
  const token = String(authHeader).replace(/^Bearer\s+/i, '').trim();
  if (!token) return { error: 401, reason: 'missing_token' };

  let user;
  try {
    const userResp = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { Authorization: `Bearer ${token}`, apikey: SUPABASE_ANON_KEY }
    });
    if (!userResp.ok) return { error: 401, reason: 'invalid_session' };
    user = await userResp.json();
  } catch (e) {
    return { error: 401, reason: 'auth_check_failed' };
  }

  try {
    const rpcResp = await fetch(`${SUPABASE_URL}/rest/v1/rpc/ai_check_and_increment_usage`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: SUPABASE_ANON_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ p_kind: kind, p_daily_limit: dailyLimit })
    });

    const bodyText = await rpcResp.text();

    if (!rpcResp.ok) {
      if (bodyText.includes('blocked_user')) return { error: 403, reason: 'blocked' };
      return { error: 500, reason: 'usage_check_failed', detail: bodyText.slice(0, 300) };
    }

    const rows = JSON.parse(bodyText);
    const usage = Array.isArray(rows) ? rows[0] : rows;
    if (!usage || usage.allowed !== true) {
      return { error: 429, reason: 'daily_limit_reached', usage };
    }

    return { user, token, usage };
  } catch (e) {
    return { error: 500, reason: 'usage_check_failed' };
  }
}

module.exports = { verifyUserAndUsage };
