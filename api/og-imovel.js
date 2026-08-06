// Serve meta tags de Open Graph pra quando o link de um imóvel é
// compartilhado (WhatsApp, Facebook, etc). A página real
// (imovel-publico.html) é renderizada 100% no cliente via JS, e
// crawlers de link preview não executam JS — então sem isso o preview
// sai sem foto/título/preço, só um card genérico ou quebrado. O
// vercel.json só manda bots pra cá (via user-agent); visitantes reais
// continuam batendo direto na página estática.
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SITE_URL = 'https://www.grupocaptar.com.br';

function escHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

module.exports = async (req, res) => {
  const id = (req.query && req.query.id) || '';
  const canonical = `${SITE_URL}/imovel-publico.html${id ? '?id=' + encodeURIComponent(id) : ''}`;

  let im = null;
  if (SUPABASE_URL && SUPABASE_ANON_KEY && id) {
    try {
      const r = await fetch(
        `${SUPABASE_URL}/rest/v1/imoveis?id=eq.${encodeURIComponent(id)}&publico=eq.true&select=titulo,preco,endereco,quartos,tipo,fotos`,
        { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } }
      );
      if (r.ok) {
        const rows = await r.json();
        im = Array.isArray(rows) && rows[0] ? rows[0] : null;
      }
    } catch (e) { /* segue com im=null, cai no fallback genérico abaixo */ }
  }

  const titulo = im?.titulo || 'Imóvel';
  const preco = im?.preco || 'Sob consulta';
  const quartosTxt = im?.quartos > 0 ? `${im.quartos} quartos · ` : '';
  const ogTitle = `${preco} — ${titulo}`;
  const ogDesc = `${quartosTxt}${im?.endereco || 'Anúncio de imóvel — Grupo Captar'}`;
  const fotoPath = Array.isArray(im?.fotos) && im.fotos.length ? im.fotos[0] : null;
  const ogImageTag = fotoPath
    ? `<meta property="og:image" content="${escHtml(`${SUPABASE_URL}/storage/v1/object/public/imoveis-fotos/${fotoPath}`)}"/>\n<meta name="twitter:card" content="summary_large_image"/>`
    : '';

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=3600');
  res.status(200).send(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8"/>
<title>${escHtml(ogTitle)}</title>
<meta property="og:type" content="website"/>
<meta property="og:site_name" content="Grupo Captar"/>
<meta property="og:title" content="${escHtml(ogTitle)}"/>
<meta property="og:description" content="${escHtml(ogDesc)}"/>
<meta property="og:url" content="${escHtml(canonical)}"/>
${ogImageTag}
<link rel="canonical" href="${escHtml(canonical)}"/>
<meta http-equiv="refresh" content="0; url=${escHtml(canonical)}"/>
</head>
<body>
<p>Redirecionando para <a href="${escHtml(canonical)}">${escHtml(titulo)}</a>…</p>
</body>
</html>`);
};
