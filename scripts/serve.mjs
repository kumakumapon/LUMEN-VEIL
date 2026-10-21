import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, sep } from 'node:path';
const root = resolve(process.argv[2] === 'dist' ? 'dist' : 'web');
const port = Number(process.env.PORT || 4173);
const mime = { '.html': 'text/html', '.css': 'text/css', '.mjs': 'text/javascript', '.svg': 'image/svg+xml', '.json': 'application/json' };
const server = createServer(async (req, res) => {
  const url = new URL(req.url || '/', 'http://localhost');
  // Strip the production project prefix to reproduce GitHub Pages locally.
  const path = url.pathname.replace(/^\/LUMEN-VEIL(?=\/|$)/, '') || '/';
  const abs = resolve(root, '.' + path, path.endsWith('/') ? 'index.html' : '');
  if (abs !== root && !abs.startsWith(root + sep)) { res.writeHead(403).end(); return; }
  try {
    const s = await stat(abs);
    if (!s.isFile()) throw Error('Not a file');
    res.setHeader('Content-Type', (mime[abs.slice(abs.lastIndexOf('.'))] || 'application/octet-stream') + '; charset=utf-8');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.end(await readFile(abs));
  } catch { res.writeHead(404).end('Not Found'); }
});
server.listen(port, '127.0.0.1', () => console.log(`LUMEN VEIL http://127.0.0.1:${port}/LUMEN-VEIL/`));
