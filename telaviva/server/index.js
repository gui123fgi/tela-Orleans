import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import config from './config.js';
import * as R from './rooms.js';

const PUBLIC = join(fileURLToPath(new URL('.', import.meta.url)), '..', 'public');
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon' };

const json = (res, status, obj) => { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(obj)); };
const readBody = req => new Promise(ok => {
  let d = ''; req.on('data', c => (d += c));
  req.on('end', () => { try { ok(JSON.parse(d || '{}')); } catch { ok({}); } });
});

async function api(req, res, url) {
  const [,, resource, code, action] = url.pathname.split('/'); // /api/<resource>/<código>/<ação>
  const b = req.method === 'POST' ? await readBody(req) : {};
  if (resource === 'config') return json(res, 200, { iceServers: config.iceServers });
  if (resource !== 'rooms') return json(res, 404, { error: 'Rota não encontrada.' });
  if (!code) return json(res, 200, { code: R.createRoom().code });

  const room = R.getRoom(code);
  if (!room) return json(res, 404, { error: 'Sala não encontrada.' });
  if (!action) return json(res, 200, { code: room.code });

  if (action === 'join') {
    const name = String(b.name || '').trim();
    if (!name) return json(res, 400, { error: 'Informe seu nome.' });
    const me = R.addPeer(room, name);
    return json(res, 200, { me: me.id, token: me.token, ownerId: room.ownerId, presenter: room.presenter, peers: [...room.peers.values()].map(R.pub) });
  }

  const peer = R.byToken(room, b.token ?? url.searchParams.get('token'));
  if (!peer) return json(res, 401, { error: 'Sessão inválida.' });

  if (action === 'events') {
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
    res.write(': ok\n\n'); peer.res = res;
    R.broadcast(room, 'peer-joined', R.pub(peer), peer.id);
    const ka = setInterval(() => res.write(': ka\n\n'), 25000);
    return void req.on('close', () => { clearInterval(ka); if (peer.res === res) R.removePeer(room, peer.id); });
  }

  const owner = peer.id === room.ownerId;
  switch (action) {
    case 'signal': { const to = room.peers.get(b.to); if (to) R.send(to, 'signal', { from: peer.id, data: b.data }); return json(res, 200, {}); }
    case 'mic': peer.mic = !!b.mic; R.broadcast(room, 'peer-update', R.pub(peer)); return json(res, 200, {});
    case 'share':
      if (b.on) {
        if (room.presenter && room.presenter.id !== peer.id) return json(res, 409, { error: 'Outra pessoa já está compartilhando a tela.' });
        room.presenter = { id: peer.id, streamId: b.streamId };
      } else if (room.presenter?.id === peer.id) room.presenter = null;
      R.broadcast(room, 'presenter', room.presenter);
      return json(res, 200, {});
    case 'rotate': if (!owner) return json(res, 403, { error: 'Apenas o dono pode fazer isso.' }); R.rotateCode(room); return json(res, 200, {});
    case 'close': if (!owner) return json(res, 403, { error: 'Apenas o dono pode fazer isso.' }); R.closeRoom(room); return json(res, 200, {});
    case 'leave': R.removePeer(room, peer.id); return json(res, 200, {});
  }
  json(res, 404, { error: 'Ação desconhecida.' });
}

async function serveStatic(res, pathname) {
  let file = pathname === '/' ? '/index.html' : pathname.startsWith('/sala/') ? '/sala.html' : pathname;
  file = normalize(file).replace(/^(\.\.[/\\])+/, '');
  try {
    const data = await readFile(join(PUBLIC, file));
    res.writeHead(200, { 'Content-Type': MIME[extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(data);
  } catch { res.writeHead(404); res.end('Não encontrado'); }
}

http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  (url.pathname.startsWith('/api/') ? api(req, res, url) : serveStatic(res, url.pathname))
    .catch(() => { if (!res.headersSent) json(res, 500, { error: 'Erro interno.' }); });
}).listen(config.port, () => console.log(`Servidor em http://localhost:${config.port}`));
