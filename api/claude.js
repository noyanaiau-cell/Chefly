// Vercel serverless function — proxies recipe requests to an LLM via OpenRouter
// using the server-side OPENROUTER_API_KEY, so visitors never need their own key.
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const apiKey = process.env.OPENROUTER_API_KEY || process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'Recipe service is not configured yet.' });
    return;
  }
  const model = process.env.LLM_MODEL || 'anthropic/claude-3.5-sonnet';

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const { system, message, max_tokens } = body;
    if (!message) {
      res.status(400).json({ error: 'Missing message' });
      return;
    }

    const messages = [];
    if (system) messages.push({ role: 'system', content: system });
    messages.push({ role: 'user', content: message });

    const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://www.aichefly.com',
        'X-Title': 'Chefly',
      },
      body: JSON.stringify({
        model,
        max_tokens: max_tokens || 2048,
        messages,
      }),
    });

    const data = await r.json();
    if (!r.ok) {
      const msg = data?.error?.message || `LLM error ${r.status}`;
      res.status(r.status).json({ error: msg });
      return;
    }
    const text = data?.choices?.[0]?.message?.content || '';
    res.status(200).json({ text });
  } catch (e) {
    res.status(500).json({ error: e.message || 'Unexpected server error' });
  }
}
