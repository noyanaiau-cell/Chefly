// Vercel serverless function — proxies recipe requests to the Anthropic API
// using the server-side ANTHROPIC_API_KEY, so visitors never need their own key.
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'Recipe service is not configured yet.' });
    return;
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const { system, message, max_tokens } = body;
    if (!message) {
      res.status(400).json({ error: 'Missing message' });
      return;
    }

    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: max_tokens || 2048,
        system: system || '',
        messages: [{ role: 'user', content: message }],
      }),
    });

    const data = await r.json();
    if (!r.ok) {
      const msg = data?.error?.message || `Anthropic error ${r.status}`;
      res.status(r.status).json({ error: msg });
      return;
    }
    res.status(200).json({ text: data?.content?.[0]?.text || '' });
  } catch (e) {
    res.status(500).json({ error: e.message || 'Unexpected server error' });
  }
}
