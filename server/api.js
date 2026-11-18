// The website's small backend: salon login, saving the editable content and photo uploads.
// Used by the production server (server/index.js) and by the Vite dev server (vite.config.ts).
//
//   GET  /api/content   public: the salon's saved content (404 = use the built-in defaults)
//   GET  /api/me        is the editor signed in?
//   POST /api/login     { user, password }  -> session cookie
//   POST /api/logout
//   PUT  /api/content   (signed in) save content
//   POST /api/upload    (signed in) { data: "data:image/jpeg;base64,..." } -> { url }
//   GET  /uploads/<file>  uploaded photos
//
// Credentials come from .env (ADMIN_USER, ADMIN_PASSWORD_HASH); create them with
// `npm run set-password -- <user> <password>`.

import { randomBytes, scrypt as scryptCb, timingSafeEqual } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readFile, rename, writeFile, copyFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { promisify } from 'node:util';
import { sanitizeContent, UPLOAD_RE } from '../website/assets/js/content.js';

const scrypt = promisify(scryptCb);

const SESSION_HOURS = 12;
const COOKIE = 'salon_session';
const MAX_JSON = 1_000_000; // content
const MAX_UPLOAD = 20_000_000; // base64 photo (~15 MB image)
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_MAX_FAILS = 8;

const IMAGE_TYPES = {
  'image/jpeg': { ext: 'jpg', magic: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  'image/png': { ext: 'png', magic: (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  'image/webp': { ext: 'webp', magic: (b) => b.subarray(0, 4).toString() === 'RIFF' && b.subarray(8, 12).toString() === 'WEBP' },
};
const EXT_TYPES = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };

/* ------------------------------------------------------------ passwords */

/** "scrypt$<salt b64>$<hash b64>" */
export async function hashPassword(password) {
  const salt = randomBytes(16);
  const hash = await scrypt(password, salt, 64);
  return `scrypt$${salt.toString('base64')}$${hash.toString('base64')}`;
}

async function verifyPassword(password, stored) {
  const [kind, saltB64, hashB64] = String(stored ?? '').split('$');
  if (kind !== 'scrypt' || !saltB64 || !hashB64) return false;
  const expected = Buffer.from(hashB64, 'base64');
  const actual = await scrypt(password, Buffer.from(saltB64, 'base64'), expected.length);
  return timingSafeEqual(actual, expected);
}

function safeEqualText(a, b) {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && timingSafeEqual(x, y);
}

/* ------------------------------------------------------------ http helpers */

function send(res, status, body, headers = {}) {
  const json = body === undefined ? '' : JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    ...headers,
  });
  res.end(json);
}

function readBody(req, limit) {
  return new Promise((resolveBody, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > limit) {
        reject(Object.assign(new Error('too large'), { status: 413 }));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => {
      try {
        resolveBody(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'));
      } catch {
        reject(Object.assign(new Error('bad json'), { status: 400 }));
      }
    });
    req.on('error', reject);
  });
}

function cookies(req) {
  const out = {};
  for (const part of String(req.headers.cookie ?? '').split(';')) {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

/** Client address. Behind a reverse proxy set TRUST_PROXY=1 so X-Forwarded-For is used. */
function clientIp(req) {
  if (process.env.TRUST_PROXY === '1') {
    const fwd = String(req.headers['x-forwarded-for'] ?? '').split(',')[0].trim();
    if (fwd) return fwd;
  }
  return req.socket?.remoteAddress ?? 'unknown';
}

/** Blocks cross-site form posts: state-changing calls must be JSON from this same site. */
function sameOrigin(req) {
  if (!String(req.headers['content-type'] ?? '').startsWith('application/json')) return false;
  const origin = req.headers.origin;
  if (!origin) return true;
  if (process.env.ALLOWED_ORIGIN && origin === process.env.ALLOWED_ORIGIN) return true;
  try {
    return new URL(origin).host === req.headers.host;
  } catch {
    return false;
  }
}

/* ------------------------------------------------------------ api */

export function createApi({ dataDir }) {
  const root = resolve(dataDir);
  const contentFile = join(root, 'content.json');
  const uploadsDir = join(root, 'uploads');
  const sessions = new Map(); // token -> expiry time
  const fails = new Map(); // ip -> { count, since }

  const signedIn = (req) => {
    const token = cookies(req)[COOKIE];
    const exp = token && sessions.get(token);
    if (!exp) return false;
    if (exp < Date.now()) {
      sessions.delete(token);
      return false;
    }
    return true;
  };

  const sessionCookie = (req, token, maxAge) => {
    const secure = req.socket?.encrypted || req.headers['x-forwarded-proto'] === 'https' ? '; Secure' : '';
    return `${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${secure}`;
  };

  async function login(req, res) {
    const ip = clientIp(req);
    const now = Date.now();
    for (const [key, v] of fails) if (now - v.since > LOGIN_WINDOW_MS) fails.delete(key);
    // Count the attempt before the slow password check, so parallel requests can't skip the limit.
    const attempt = fails.get(ip) ?? { count: 0, since: now };
    if (attempt.count >= LOGIN_MAX_FAILS) return send(res, 429, { error: 'too_many' });
    attempt.count++;
    fails.set(ip, attempt);

    const body = await readBody(req, 10_000);
    const user = String(body.user ?? '').trim();
    const password = String(body.password ?? '');
    const wantUser = process.env.ADMIN_USER;
    const wantHash = process.env.ADMIN_PASSWORD_HASH;
    if (!wantUser || !wantHash) return send(res, 503, { error: 'not_configured' });

    const ok = safeEqualText(user, wantUser) & (await verifyPassword(password, wantHash));
    if (!ok) return send(res, 401, { error: 'bad_login' });
    fails.delete(ip);
    const token = randomBytes(32).toString('hex');
    sessions.set(token, Date.now() + SESSION_HOURS * 3600 * 1000);
    send(res, 200, { ok: true }, { 'Set-Cookie': sessionCookie(req, token, SESSION_HOURS * 3600) });
  }

  async function saveContent(req, res) {
    const body = await readBody(req, MAX_JSON);
    const clean = sanitizeContent(body);
    await mkdir(root, { recursive: true });
    if (existsSync(contentFile)) await copyFile(contentFile, join(root, 'content.backup.json'));
    const tmp = `${contentFile}.tmp`;
    await writeFile(tmp, JSON.stringify(clean, null, 2), 'utf8');
    await rename(tmp, contentFile);
    send(res, 200, clean);
  }

  async function upload(req, res) {
    const body = await readBody(req, MAX_UPLOAD);
    const m = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(String(body.data ?? ''));
    const type = m && IMAGE_TYPES[m[1]];
    if (!type) return send(res, 415, { error: 'bad_image' });
    const bytes = Buffer.from(m[2], 'base64');
    if (bytes.length < 32 || !type.magic(bytes)) return send(res, 415, { error: 'bad_image' });
    await mkdir(uploadsDir, { recursive: true });
    const name = `${randomBytes(12).toString('hex')}.${type.ext}`;
    await writeFile(join(uploadsDir, name), bytes);
    send(res, 200, { url: `uploads/${name}` });
  }

  async function serveUpload(req, res, path) {
    const rel = path.slice(1); // "uploads/<file>"
    if (!UPLOAD_RE.test(rel)) return send(res, 404, { error: 'not_found' });
    try {
      const data = await readFile(join(uploadsDir, rel.slice('uploads/'.length)));
      res.writeHead(200, {
        'Content-Type': EXT_TYPES[rel.split('.').pop()],
        'Cache-Control': 'public, max-age=31536000, immutable',
        'X-Content-Type-Options': 'nosniff',
      });
      res.end(data);
    } catch {
      send(res, 404, { error: 'not_found' });
    }
  }

  /** Connect-style middleware: handles /api/* and /uploads/*, passes everything else on. */
  return async function api(req, res, next) {
    let path;
    try {
      path = decodeURIComponent(new URL(req.url ?? '/', 'http://x').pathname);
    } catch {
      return send(res, 400, { error: 'bad_request' });
    }
    if (!path.startsWith('/api/') && !path.startsWith('/uploads/')) return next?.();
    try {
      if (path.startsWith('/uploads/') && req.method === 'GET') return await serveUpload(req, res, path);

      const write = req.method !== 'GET' && req.method !== 'HEAD';
      if (write && !sameOrigin(req)) return send(res, 403, { error: 'forbidden' });

      if (path === '/api/content' && req.method === 'GET') {
        if (!existsSync(contentFile)) return send(res, 404, { error: 'no_content' });
        return send(res, 200, sanitizeContent(JSON.parse(await readFile(contentFile, 'utf8'))));
      }
      if (path === '/api/me' && req.method === 'GET') return send(res, 200, { signedIn: signedIn(req) });
      if (path === '/api/login' && req.method === 'POST') return await login(req, res);
      if (path === '/api/logout' && req.method === 'POST') {
        const token = cookies(req)[COOKIE];
        if (token) sessions.delete(token);
        return send(res, 200, { ok: true }, { 'Set-Cookie': sessionCookie(req, '', 0) });
      }

      if (!signedIn(req)) return send(res, 401, { error: 'signed_out' });
      if (path === '/api/content' && req.method === 'PUT') return await saveContent(req, res);
      if (path === '/api/upload' && req.method === 'POST') return await upload(req, res);
      send(res, 404, { error: 'not_found' });
    } catch (err) {
      if (!res.headersSent) send(res, err.status ?? 500, { error: err.status ? err.message : 'server_error' });
      if (!err.status) console.error(err);
    }
  };
}

/** Loads .env from the project folder if it exists. */
export function loadEnv(projectDir) {
  const file = join(projectDir, '.env');
  if (existsSync(file)) process.loadEnvFile(file);
}
