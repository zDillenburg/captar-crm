const { verifyUserAndUsage } = require('./_ai-shared');

const IMAGE_DAILY_LIMIT = parseInt(process.env.AI_IMAGE_DAILY_LIMIT || '10', 10);
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = 'gemini-3-pro-image';

module.exports = async (req, res) => {
  if (req.method !== 'POST') { res.status(405).json({ error: 'method_not_allowed' }); return; }
  if (!GEMINI_API_KEY) { res.status(500).json({ error: 'server_misconfigured' }); return; }

  const auth = await verifyUserAndUsage(req, 'imagem', IMAGE_DAILY_LIMIT);
  if (auth.error) {
    res.status(auth.error).json({ error: auth.reason, usage: auth.usage || null });
    return;
  }

  const body = req.body || {};
  const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';
  const inputImage = body.inputImage; // opcional: {mimeType, data(base64 sem prefixo)} — foto do imóvel
  const logoImage = body.logoImage;   // opcional: {mimeType, data(base64 sem prefixo)} — logo da imobiliária

  if (!prompt) { res.status(400).json({ error: 'invalid_prompt' }); return; }
  if (inputImage && (typeof inputImage.mimeType !== 'string' || typeof inputImage.data !== 'string')) {
    res.status(400).json({ error: 'invalid_input_image' });
    return;
  }
  if (logoImage && (typeof logoImage.mimeType !== 'string' || typeof logoImage.data !== 'string')) {
    res.status(400).json({ error: 'invalid_logo_image' });
    return;
  }

  const parts = [];
  if (inputImage) {
    parts.push({ inlineData: { mimeType: inputImage.mimeType, data: inputImage.data } });
  }
  if (logoImage) {
    parts.push({ inlineData: { mimeType: logoImage.mimeType, data: logoImage.data } });
  }
  const finalText = logoImage
    ? `${prompt}\n\n(A última imagem anexada é o logo da imobiliária — inclua-o de forma discreta e profissional, por exemplo no canto inferior direito, sem cobrir elementos principais da imagem.)`
    : prompt;
  parts.push({ text: finalText });

  try {
    const geminiResp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
      {
        method: 'POST',
        headers: { 'x-goog-api-key': GEMINI_API_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: { responseModalities: ['Image'] }
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
    const imgPart = ((candidate && candidate.content && candidate.content.parts) || [])
      .find(p => p.inlineData && p.inlineData.data);

    if (!imgPart) {
      res.status(200).json({ image: null, blocked: finishReason === 'SAFETY', finishReason: finishReason || null, usage: auth.usage });
      return;
    }

    res.status(200).json({
      image: { mimeType: imgPart.inlineData.mimeType || 'image/png', data: imgPart.inlineData.data },
      usage: auth.usage
    });
  } catch (e) {
    res.status(502).json({ error: 'gemini_request_failed' });
  }
};

module.exports.config = { maxDuration: 60 };
