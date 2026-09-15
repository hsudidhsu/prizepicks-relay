// prizepicks-relay — tiny pass-through server for Render/Railway/Fly
//
// Purpose: run on a normal VPS-style IP (not Cloudflare edge) so
// PrizePicks requests come from an IP that isn't pre-flagged as
// datacenter/edge bot traffic. This does NOT bypass PrizePicks' terms
// of service — it only changes the network origin of the request.

import express from 'express';

const app = express();
const PORT = process.env.PORT || 3000;
const SHARED_SECRET = process.env.RELAY_SHARED_SECRET || '';

const BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'en-US,en;q=0.9',
};

function checkAuth(req, res) {
  if (!SHARED_SECRET) return true;
  if (req.get('X-Relay-Secret') === SHARED_SECRET) return true;
  res.status(401).json({ error: 'unauthorized' });
  return false;
}

app.get('/prizepicks/projections', async (req, res) => {
  if (!checkAuth(req, res)) return;
  const qs = new URLSearchParams(req.query).toString();
  const target = `https://api.prizepicks.com/projections${qs ? '?' + qs : ''}`;
  try {
    const r = await fetch(target, { headers: BROWSER_HEADERS });
    const text = await r.text();
    res.status(r.status).type('application/json').send(text);
  } catch (e) {
    res.status(502).json({ error: 'relay fetch failed: ' + e.message });
  }
});

app.get('/fetch', async (req, res) => {
  if (!checkAuth(req, res)) return;
  const target = req.query.url;
  if (!target || !/^https:\/\/api\.prizepicks\.com\//.test(target)) {
    return res.status(400).json({ error: 'url must be an https://api.prizepicks.com/... URL' });
  }
  try {
    const r = await fetch(target, { headers: BROWSER_HEADERS });
    const text = await r.text();
    res.status(r.status).type('application/json').send(text);
  } catch (e) {
    res.status(502).json({ error: 'relay fetch failed: ' + e.message });
  }
});

app.get('/health', (req, res) => res.json({ ok: true }));

app.listen(PORT, () => console.log(`prizepicks-relay listening on :${PORT}`));
