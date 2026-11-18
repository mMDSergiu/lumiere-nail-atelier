// Production server: serves the built website (dist/website) plus the API and uploaded photos.
// Run `npm run build` first, then `npm start`. Port: PORT in .env (default 4321).

import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApi, loadEnv } from './api.js';

const projectDir = fileURLToPath(new URL('..', import.meta.url));
loadEnv(projectDir);

const siteDir = resolve(projectDir, 'dist/website');
const api = createApi({ dataDir: process.env.DATA_DIR || join(projectDir, 'data') });
const port = Number(process.env.PORT) || 4321;

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.json': 'application/json',
};

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Frame-Options': 'SAMEORIGIN',
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: blob:",
    "connect-src 'self'",
    'frame-src https:',
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'self'",
  ].join('; '),
};

async function serveStatic(req, res) {
  let path;
  try {
    path = decodeURIComponent(new URL(req.url ?? '/', 'http://x').pathname);
  } catch {
    res.writeHead(400).end();
    return;
  }
  if (path.endsWith('/')) path += 'index.html';
  const file = resolve(siteDir, normalize('.' + path));
  if (file !== siteDir && !file.startsWith(siteDir + sep)) {
    res.writeHead(403).end();
    return;
  }
  try {
    if (!(await stat(file)).isFile()) throw new Error('not a file');
    const data = await readFile(file);
    const isAsset = path.startsWith('/assets/');
    res.writeHead(200, {
      ...SECURITY_HEADERS,
      'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream',
      'Cache-Control': isAsset ? 'public, max-age=31536000, immutable' : 'no-cache',
    });
    res.end(data);
  } catch {
    res.writeHead(404, { ...SECURITY_HEADERS, 'Content-Type': 'text/plain; charset=utf-8' }).end('Not found');
  }
}

function fail(res, err) {
  console.error(err);
  if (!res.headersSent) res.writeHead(500).end();
}

createServer((req, res) => {
  api(req, res, () => serveStatic(req, res).catch((err) => fail(res, err))).catch((err) => fail(res, err));
}).listen(port, () => {
  console.log(`\n  Website running at http://localhost:${port}\n`);
  if (!process.env.ADMIN_USER || !process.env.ADMIN_PASSWORD_HASH) {
    console.log('  Salon login is not set up yet. Run: npm run set-password -- <user> <password>\n');
  }
});
