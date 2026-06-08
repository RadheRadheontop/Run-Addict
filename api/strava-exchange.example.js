const STRAVA_TOKEN_URL = 'https://www.strava.com/oauth/token';
const STRAVA_ACTIVITIES_URL = 'https://www.strava.com/api/v3/athlete/activities?per_page=100';

function setCors(req, res) {
  const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  const requestOrigin = req.headers.origin || '';
  const allowOrigin = allowedOrigins.length
    ? allowedOrigins.includes(requestOrigin) ? requestOrigin : allowedOrigins[0]
    : requestOrigin || '*';

  res.setHeader('Access-Control-Allow-Origin', allowOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') return JSON.parse(req.body || '{}');

  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString('utf8');
  return raw ? JSON.parse(raw) : {};
}

module.exports = async function handler(req, res) {
  setCors(req, res);

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.json({ error: 'Method not allowed' });
    return;
  }

  const clientId = process.env.STRAVA_CLIENT_ID;
  const clientSecret = process.env.STRAVA_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    res.statusCode = 500;
    res.json({ error: 'Strava server credentials are not configured.' });
    return;
  }

  try {
    const { code, redirectUri } = await readBody(req);
    if (!code || !redirectUri) {
      res.statusCode = 400;
      res.json({ error: 'code and redirectUri are required.' });
      return;
    }

    const tokenResponse = await fetch(STRAVA_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri
      })
    });

    const tokenPayload = await tokenResponse.json();
    if (!tokenResponse.ok) {
      res.statusCode = tokenResponse.status;
      res.json({ error: 'Strava token exchange failed.', details: tokenPayload });
      return;
    }

    const activitiesResponse = await fetch(STRAVA_ACTIVITIES_URL, {
      headers: { Authorization: `Bearer ${tokenPayload.access_token}` }
    });
    const activities = activitiesResponse.ok ? await activitiesResponse.json() : [];

    res.statusCode = 200;
    res.json({
      athlete: tokenPayload.athlete,
      activities
    });
  } catch (error) {
    res.statusCode = 500;
    res.json({ error: 'Strava exchange failed.' });
  }
};
