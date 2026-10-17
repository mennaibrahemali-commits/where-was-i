// A tiny stand-in for the parts of Supabase the app uses (auth + one table),
// for browser tests only. Enforces the same rule as the real database
// policies: each signed-in user can only read and write their own rows.
// Run: node tests/mock_supabase.mjs [port]
import http from 'node:http';
import { randomUUID } from 'node:crypto';

const PORT = Number(process.argv[2] || 54321);
const users = new Map();     // email -> { id, email, password }
const tokens = new Map();    // access/refresh token -> user id
const rows = new Map();      // `${user_id}|${id}` -> { user_id, id, data, updated_at }
let confirmEmails = false;
let clock = 0;
const START = Date.now();

const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
function session(user) {
  const exp = Math.floor(Date.now() / 1000) + 3600;
  const access = `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub: user.id, email: user.email, role: 'authenticated', aud: 'authenticated', exp, iat: exp - 3600, session_id: randomUUID() })}.sig${randomUUID().slice(0, 8)}`;
  const refresh = 'r-' + randomUUID();
  tokens.set(access, user.id);
  tokens.set(refresh, user.id);
  return { access_token: access, token_type: 'bearer', expires_in: 3600, expires_at: exp, refresh_token: refresh, user: publicUser(user) };
}
const publicUser = (u) => ({ id: u.id, aud: 'authenticated', role: 'authenticated', email: u.email, email_confirmed_at: new Date().toISOString(), app_metadata: { provider: 'email' }, user_metadata: {}, created_at: new Date().toISOString() });
const userFromAuth = (req) => {
  const h = req.headers.authorization || '';
  const id = tokens.get(h.replace(/^Bearer\s+/i, ''));
  return id ? [...users.values()].find((u) => u.id === id) : null;
};

function send(res, status, body, extra = {}) {
  res.writeHead(status, { 'content-type': 'application/json', ...extra });
  res.end(body === undefined ? '' : JSON.stringify(body));
}
const authErr = (res, status, code, msg) => send(res, status, { code: status, error_code: code, msg });

async function readBody(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const s = Buffer.concat(chunks).toString();
  return s ? JSON.parse(s) : {};
}

const server = http.createServer(async (req, res) => {
  const origin = req.headers.origin || '*';
  res.setHeader('access-control-allow-origin', origin);
  res.setHeader('access-control-allow-credentials', 'true');
  res.setHeader('access-control-allow-headers', req.headers['access-control-request-headers'] || '*');
  res.setHeader('access-control-allow-methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.setHeader('access-control-expose-headers', 'content-range, x-supabase-api-version');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  const url = new URL(req.url, `http://localhost:${PORT}`);
  const path = url.pathname;
  try {
    // ── test controls ──
    if (path === '/__admin/confirm-mode') { confirmEmails = (await readBody(req)).on; return send(res, 200, { confirmEmails }); }
    if (path === '/__admin/rows') return send(res, 200, [...rows.values()]);
    if (path === '/__admin/expire-all') { tokens.clear(); return send(res, 200, {}); }

    // ── auth ──
    if (path === '/auth/v1/signup' && req.method === 'POST') {
      const { email, password } = await readBody(req);
      if (!/^\S+@\S+\.\S+$/.test(email || '')) return authErr(res, 400, 'validation_failed', 'Unable to validate email address: invalid format');
      if (!password || password.length < 6) return authErr(res, 422, 'weak_password', 'Password should be at least 6 characters.');
      if (users.has(email)) return authErr(res, 422, 'user_already_exists', 'User already registered');
      const user = { id: randomUUID(), email, password };
      users.set(email, user);
      if (confirmEmails) return send(res, 200, { ...publicUser(user), email_confirmed_at: null, confirmation_sent_at: new Date().toISOString() });
      return send(res, 200, session(user));
    }
    if (path === '/auth/v1/token' && req.method === 'POST') {
      const grant = url.searchParams.get('grant_type');
      const body = await readBody(req);
      if (grant === 'password') {
        const u = users.get(body.email);
        if (!u || u.password !== body.password) return authErr(res, 400, 'invalid_credentials', 'Invalid login credentials');
        return send(res, 200, session(u));
      }
      if (grant === 'refresh_token') {
        const id = tokens.get(body.refresh_token);
        const u = id && [...users.values()].find((x) => x.id === id);
        if (!u) return authErr(res, 400, 'refresh_token_not_found', 'Invalid Refresh Token: Refresh Token Not Found');
        return send(res, 200, session(u));
      }
    }
    if (path === '/auth/v1/user' && req.method === 'GET') {
      const u = userFromAuth(req);
      return u ? send(res, 200, publicUser(u)) : authErr(res, 403, 'bad_jwt', 'invalid JWT');
    }
    if (path === '/auth/v1/user' && req.method === 'PUT') {
      const u = userFromAuth(req);
      if (!u) return authErr(res, 403, 'bad_jwt', 'invalid JWT');
      const { password } = await readBody(req);
      if (password) u.password = password;
      return send(res, 200, publicUser(u));
    }
    if (path === '/auth/v1/logout') { res.writeHead(204); res.end(); return; }
    if (path === '/auth/v1/recover') return send(res, 200, {});

    // ── data (PostgREST-style), owner-only like the real RLS policies ──
    if (path === '/rest/v1/wwi_docs') {
      const u = userFromAuth(req);
      if (!u) return send(res, 401, { code: 'PGRST301', message: 'JWT expired' });
      if (req.method === 'GET') {
        const gt = url.searchParams.get('updated_at');
        const since = gt && gt.startsWith('gt.') ? gt.slice(3) : null;
        const offset = Number(url.searchParams.get('offset') || 0);
        const limit = Number(url.searchParams.get('limit') || 1000);
        const mine = [...rows.values()]
          .filter((r) => r.user_id === u.id && (!since || r.updated_at > since))
          .sort((a, b) => a.updated_at.localeCompare(b.updated_at))
          .slice(offset, offset + limit)
          .map((r) => ({ id: r.id, data: r.data, updated_at: r.updated_at }));
        return send(res, 200, mine);
      }
      if (req.method === 'POST') {
        const body = await readBody(req);
        const list = Array.isArray(body) ? body : [body];
        for (const r of list) {
          if (r.user_id !== u.id) return send(res, 403, { code: '42501', message: 'new row violates row-level security policy for table "wwi_docs"' });
        }
        for (const r of list) {
          clock += 1;
          const stamp = new Date(START + clock).toISOString(); // strictly increasing, like now() per write
          rows.set(`${r.user_id}|${r.id}`, { user_id: r.user_id, id: r.id, data: r.data, updated_at: stamp });
        }
        res.writeHead(201); res.end(); return;
      }
    }
    send(res, 404, { message: 'not found: ' + path });
  } catch (e) {
    send(res, 500, { message: String(e) });
  }
});

server.listen(PORT, () => console.log('mock supabase on', PORT));
