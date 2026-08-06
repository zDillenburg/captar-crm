// Mesma ideia de og-imovel.js, mas pro perfil público do corretor —
// aceita tanto ?id= (user_id) quanto ?slug= (link com o nome, /c/slug).
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SITE_URL = 'https://www.grupocaptar.com.br';

function escHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

module.exports = async (req, res) => {
  const id = (req.query && req.query.id) || '';
  const slug = (req.query && req.query.slug) || '';
  const canonical = slug
    ? `${SITE_URL}/c/${encodeURIComponent(slug)}`
    : `${SITE_URL}/corretor-publico.html${id ? '?id=' + encodeURIComponent(id) : ''}`;

  let perfil = null;
  if (SUPABASE_URL && SUPABASE_ANON_KEY && (id || slug)) {
    try {
      const filtro = slug ? `slug=eq.${encodeURIComponent(slug)}` : `user_id=eq.${encodeURIComponent(id)}`;
      const r = await fetch(
        `${SUPABASE_URL}/rest/v1/perfil_publico?${filtro}&ativo=eq.true&select=nome,tagline,creci,user_id`,
        { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } }
      );
      if (r.ok) {
        const rows = await r.json();
        perfil = Array.isArray(rows) && rows[0] ? rows[0] : null;
      }
    } catch (e) { /* segue com perfil=null, cai no fallback genérico abaixo */ }
  }

  const nome = perfil?.nome || 'Corretor';
  const ogTitle = `${nome} — Grupo Captar`;
  const ogDesc = perfil?.tagline || (perfil?.creci ? `CRECI ${perfil.creci} · Corretor parceiro Grupo Captar` : 'Corretor parceiro Grupo Captar — veja os imóveis disponíveis.');
  const ogImageTag = perfil?.user_id
    ? `<meta property="og:image" content="${escHtml(`${SUPABASE_URL}/storage/v1/object/public/logos/${perfil.user_id}/avatar.jpg`)}"/>\n<meta name="twitter:card" content="summary_large_image"/>`
    : '';

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=3600');
  res.status(200).send(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8"/>
<title>${escHtml(ogTitle)}</title>
<meta property="og:type" content="profile"/>
<meta property="og:site_name" content="Grupo Captar"/>
<meta property="og:title" content="${escHtml(ogTitle)}"/>
<meta property="og:description" content="${escHtml(ogDesc)}"/>
<meta property="og:url" content="${escHtml(canonical)}"/>
${ogImageTag}
<link rel="canonical" href="${escHtml(canonical)}"/>
<meta http-equiv="refresh" content="0; url=${escHtml(canonical)}"/>
</head>
<body>
<p>Redirecionando para <a href="${escHtml(canonical)}">${escHtml(nome)}</a>…</p>
</body>
</html>`);
};
