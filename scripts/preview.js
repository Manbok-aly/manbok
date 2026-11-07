// Serve _site/ locally. With BASE_PATH=/manbok the site is served under
// http://localhost:4000/manbok/ exactly like a GitHub Pages project site.

import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '_site');
const PORT = Number(process.env.PORT) || 4000;
const trimmed = (process.env.BASE_PATH || '').trim().replace(/^\/+|\/+$/g, '');
const BASE = trimmed ? `/${trimmed}/` : '/';
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif',
  '.webp': 'image/webp', '.svg': 'image/svg+xml', '.avif': 'image/avif', '.ico': 'image/x-icon',
};

if (!fs.existsSync(ROOT)) {
  console.error('_site/ 가 없습니다. 먼저 npm run build 를 실행하세요.');
  process.exit(1);
}

http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  let pathname;
  try { pathname = decodeURIComponent(url.pathname); } catch { pathname = ''; }
  if (`${pathname}/` === BASE) { res.writeHead(301, { Location: BASE }).end(); return; }
  if (!pathname.startsWith(BASE)) { res.writeHead(404).end('Not found'); return; }
  let file = path.join(ROOT, pathname.slice(BASE.length));
  if (!file.startsWith(ROOT)) { res.writeHead(403).end(); return; }
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) {
    if (!pathname.endsWith('/')) { res.writeHead(301, { Location: `${url.pathname}/` }).end(); return; }
    file = path.join(file, 'index.html');
  }
  fs.readFile(file, (error, data) => {
    if (error) { res.writeHead(404).end('Not found'); return; }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream' }).end(data);
  });
}).listen(PORT, () => console.log(`미리보기: http://localhost:${PORT}${BASE}  (종료: Ctrl+C)`));
