// MIDI Digger (development only, not shipped: ua-builder pack leaves dotfolders out):
// a tiny local file server so the page can read .mid bytes where file:// is not allowed
// (a plain browser during development; inside LUNA on Windows file:// works).
// Serves only .mid/.midi files under the given folders, only to this machine (127.0.0.1).
//
//   node .dev/midi-server.mjs [port] [folder ...]     default: 8795 D:\midi
//   GET /ping                    -> "ok"
//   GET /midi?path=<absolute>    -> the file's bytes

import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';

const args = process.argv.slice(2);
const port = /^\d+$/.test(args[0] ?? '') ? Number(args.shift()) : 8795;
const roots = (args.length ? args : ['D:\\midi']).map((r) => resolve(r).toLowerCase().replace(/[\\/]+$/, '') + sep);
const MAX_BYTES = 256 * 1024 * 1024;   // soundfonts are tens of MB

function allowed(path) {
  const full = resolve(path);
  const lower = full.toLowerCase();
  return roots.some((r) => lower.startsWith(r)) && /^\.(midi?|sf2|sf3|dls)$/i.test(extname(full)) ? full : null;
}

const server = createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-store');
  const url = new URL(req.url, 'http://127.0.0.1');
  if (req.method !== 'GET') return res.writeHead(405).end('method not allowed');
  if (url.pathname === '/ping') return res.writeHead(200, { 'Content-Type': 'text/plain' }).end('ok');
  if (url.pathname !== '/midi') return res.writeHead(404).end('not found');

  const path = allowed(url.searchParams.get('path') ?? '');
  if (!path) return res.writeHead(403).end('solo archivos .mid/.midi dentro de: ' + roots.join(', '));
  try {
    const st = await stat(path);
    if (!st.isFile() || st.size > MAX_BYTES) return res.writeHead(413).end('demasiado grande');
    const bytes = await readFile(path);
    res.writeHead(200, { 'Content-Type': 'audio/midi', 'Content-Length': bytes.length }).end(bytes);
  } catch (e) {
    res.writeHead(404).end(e.code ?? 'error');
  }
});

server.listen(port, '127.0.0.1', () => {
  console.log(`Servidor MIDI en http://127.0.0.1:${port}  ·  carpetas: ${roots.join(', ')}`);
  console.log('Déjalo abierto mientras uses el add-on. Ctrl+C para pararlo.');
});
