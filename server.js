import express from 'express';
import http from 'http';
import { WebSocketServer } from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 8080;
const VENUES = { cafe: '카페', restaurant: '식당', bar: '술집' };
const MAX_TABLE = 20;

const app = express();
app.use(express.static(path.join(__dirname, 'public')));

// room key -> { members: Map<id, {ws, nick, avatar}>, likes: Set<id> }
const rooms = new Map();
let nextId = 1;

app.get('/api/status', (req, res) => {
  const out = {};
  for (const v of Object.keys(VENUES)) out[v] = {};
  for (const [key, r] of rooms) {
    const [v, t] = key.split(':');
    if (out[v]) out[v][t] = r.members.size;
  }
  res.json({ venues: VENUES, maxTable: MAX_TABLE, occupancy: out });
});

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws', maxPayload: 64 * 1024 });

const send = (ws, obj) => { if (ws.readyState === 1) ws.send(JSON.stringify(obj)); };

wss.on('connection', (ws) => {
  const id = String(nextId++);
  let roomKey = null;

  const peerOf = () => {
    const r = rooms.get(roomKey);
    if (!r) return null;
    for (const [pid, m] of r.members) if (pid !== id) return { id: pid, ...m };
    return null;
  };

  const leave = () => {
    if (!roomKey) return;
    const r = rooms.get(roomKey);
    if (r) {
      r.members.delete(id);
      r.likes.clear();
      for (const [, m] of r.members) send(m.ws, { type: 'peer-left' });
      if (r.members.size === 0) rooms.delete(roomKey);
    }
    roomKey = null;
  };

  ws.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }
    if (msg.type === 'join') {
      if (roomKey) return;
      const venue = String(msg.venue || '');
      const table = parseInt(msg.table, 10);
      if (!VENUES[venue] || !(table >= 1 && table <= MAX_TABLE)) return send(ws, { type: 'error', message: '장소나 테이블 번호가 올바르지 않아요' });
      const nick = String(msg.nick || '익명').slice(0, 16);
      const avatar = typeof msg.avatar === 'object' && msg.avatar ? msg.avatar : {};
      const key = `${venue}:${table}`;
      let r = rooms.get(key);
      if (!r) { r = { members: new Map(), likes: new Set() }; rooms.set(key, r); }
      if (r.members.size >= 2) return send(ws, { type: 'full', message: '테이블이 꽉 찼어요' });
      roomKey = key;
      const existing = peerOf();
      r.members.set(id, { ws, nick, avatar });
      // the newcomer is the WebRTC initiator if someone is already seated
      send(ws, { type: 'joined', id, venue, table, peer: existing ? { nick: existing.nick, avatar: existing.avatar } : null, initiator: !!existing });
      if (existing) send(existing.ws, { type: 'peer-joined', peer: { nick, avatar } });
      return;
    }
    if (!roomKey) return;
    const peer = peerOf();
    switch (msg.type) {
      case 'motion':
      case 'signal':
        if (peer) send(peer.ws, { type: msg.type, data: msg.data });
        break;
      case 'like': {
        const r = rooms.get(roomKey);
        if (!r || !peer) break;
        r.likes.add(id);
        if (r.likes.has(peer.id)) {
          for (const [, m] of r.members) send(m.ws, { type: 'match' });
        } else send(peer.ws, { type: 'peer-liked' });
        break;
      }
      case 'leave':
        leave();
        break;
    }
  });
  ws.on('close', leave);
  ws.on('error', leave);
});

// keepalive (tunnels drop idle sockets)
setInterval(() => { for (const c of wss.clients) if (c.readyState === 1) c.ping(); }, 20000);

server.listen(PORT, () => console.log(`blind-date-proto listening on :${PORT}`));
