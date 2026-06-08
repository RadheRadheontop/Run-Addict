const crypto = require('crypto');

const SESSION_COOKIE = 'run_addict_admin';
const SESSION_TTL_SECONDS = 60 * 60 * 8;

function safeEqual(left, right) {
  const leftBuffer = Buffer.from(String(left || ''));
  const rightBuffer = Buffer.from(String(right || ''));
  if (leftBuffer.length !== rightBuffer.length) return false;
  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function sign(value, secret) {
  return crypto.createHmac('sha256', secret).update(value).digest('base64url');
}

function createSession(username, secret) {
  const expires = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  const payload = `${username}.${expires}`;
  return `${payload}.${sign(payload, secret)}`;
}

function verifySession(token, secret) {
  if (!token) return false;
  const parts = token.split('.');
  if (parts.length !== 3) return false;
  const [username, expires, signature] = parts;
  if (Number(expires) < Math.floor(Date.now() / 1000)) return false;
  return safeEqual(signature, sign(`${username}.${expires}`, secret));
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
  const username = process.env.ADMIN_USERNAME;
  const password = process.env.ADMIN_PASSWORD;
  const sessionSecret = process.env.ADMIN_SESSION_SECRET;

  if (!username || !password || !sessionSecret) {
    res.statusCode = 500;
    res.json({ error: 'Admin auth environment is not configured.' });
    return;
  }

  if (req.method === 'GET') {
    const cookie = req.headers.cookie || '';
    const match = cookie.match(new RegExp(`${SESSION_COOKIE}=([^;]+)`));
    res.statusCode = verifySession(match?.[1], sessionSecret) ? 200 : 401;
    res.json({ authenticated: res.statusCode === 200 });
    return;
  }

  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.json({ error: 'Method not allowed' });
    return;
  }

  const body = await readBody(req);
  if (!safeEqual(body.username, username) || !safeEqual(body.password, password)) {
    res.statusCode = 401;
    res.json({ error: 'Invalid credentials.' });
    return;
  }

  const token = createSession(username, sessionSecret);
  res.setHeader('Set-Cookie', `${SESSION_COOKIE}=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${SESSION_TTL_SECONDS}`);
  res.statusCode = 200;
  res.json({ authenticated: true });
};
