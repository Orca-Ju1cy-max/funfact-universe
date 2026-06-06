
export default async function handler(req, res) {

  // Hanya izinkan POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Ambil API key dari environment variable Vercel
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  if (!GEMINI_API_KEY) {
    return res.status(500).json({ error: 'API key tidak ditemukan.' });
  }

  const MODEL    = 'gemini-2.0-flash';
  const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_API_KEY}`;

  const prompt = `Kamu adalah ensiklopedia fakta mengejutkan. 
Berikan SATU funfact yang benar-benar jarang diketahui orang, unik, dan mengejutkan.
Fakta bisa tentang sains, sejarah, alam, teknologi, tubuh manusia, luar angkasa, atau psikologi.

- langsung ke intinya & pendek 
- Jangan ulangi fakta yang terlalu umum

Berikan faktanya saja.`;

  try {
    const geminiRes = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature:     1.2,
          maxOutputTokens: 10000,
          topP:            0.95,
        }
      })
    });

    if (!geminiRes.ok) {
      const err = await geminiRes.json();
      return res.status(geminiRes.status).json({ error: err?.error?.message || 'Gemini error' });
    }

    const data   = await geminiRes.json();
    const text   = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) return res.status(500).json({ error: 'Respons kosong dari Gemini.' });

    return res.status(200).json({ funfact: text.trim() });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}