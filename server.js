import express from 'express';
import http from 'http';
import { WebSocketServer } from 'ws';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { regionFromPoint } from './server/regions.js';
import { createVerifier } from './server/verify.js';
import { contactKind } from './server/filter.js';
import {
  createUser, userByToken, userById, publicUser, saveProfile, markVerified, setRegion,
  entryBlock, isBlocked, blockUser, addReport, unsuspend, rateUser, listReports, listSuspended,
  REPORT_REASONS,
} from './server/store.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 8080;
const VENUES = { cafe: '카페', restaurant: '식당', bar: '술집' };
const MAX_TABLE = Math.max(1, Math.min(200, Number(process.env.TABLES_PER_VENUE) || 30));
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';
const verifier = createVerifier({ mode: process.env.VERIFY_MODE || 'test' });

const app = express();
app.use(express.json({ limit: '32kb' }));
app.use(express.static(path.join(__dirname, 'public')));

const adminSessions = new Map();
const liveSockets = new Map();

function tokenOf(req) {
  const h = req.get('authorization') || '';
  const m = /^Bearer\s+(.+)$/i.exec(h);
  return m ? m[1].trim() : '';
}
function requireUser(req, res) {
  const user = userByToken(tokenOf(req));
  if (!user) { res.status(401).json({ error: '로그인이 필요해요' }); return null; }
  return user;
}
function requireAdmin(req, res) {
  const tok = tokenOf(req);
  const exp = adminSessions.get(tok);
  if (!tok || !exp || exp < Date.now()) { res.status(401).json({ error: '관리자 인증이 필요해요' }); return false; }
  return true;
}

app.get('/privacy', (_req, res) => res.sendFile(path.join(__dirname, 'public', 'privacy.html')));
app.get('/terms', (_req, res) => res.sendFile(path.join(__dirname, 'public', 'terms.html')));
app.get('/admin', (_req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));

app.post('/api/session', (req, res) => {
  const existing = userByToken(tokenOf(req));
  const user = existing || createUser();
  res.json({ token: user.token, user: publicUser(user), verifyMode: verifier.mode, verifyLabel: verifier.label });
});

app.get('/api/me', (req, res) => {
  const user = requireUser(req, res);
  if (!user) return;
  res.json({ user: publicUser(user), maxTable: MAX_TABLE, verifyLabel: verifier.label });
});

app.post('/api/profile', (req, res) => {
  const user = requireUser(req, res);
  if (!user) return;
  const result = saveProfile(user, req.body || {});
  if (!result.ok) return res.status(400).json(result);
  res.json({ ok: true, user: publicUser(user) });
});

app.post('/api/verify/test', async (req, res) => {
  const user = requireUser(req, res);
  if (!user) return;
  const checked = await verifier.verify(req.body || {});
  if (!checked.ok) return res.status(400).json(checked);
  const saved = markVerified(user, checked);
  if (!saved.ok) return res.status(400).json(saved);
  res.json({ ok: true, testMode: verifier.mode === 'test', user: publicUser(user) });
});

app.post('/api/region', (req, res) => {
  const user = requireUser(req, res);
  if (!user) return;
  const lat = Number(req.body?.lat);
  const lng = Number(req.body?.lng);
  const region = regionFromPoint(lat, lng);
  if (!region) return res.status(400).json({ error: '아직 지원하지 않는 동네예요. 서울·경기 주요 도시·광역시에서 인증할 수 있어요.' });
  // Coordinates are used only to name the region, then dropped.
  const saved = setRegion(user, region);
  res.json({ ok: true, region: { id: saved.id, name: saved.name, verifiedAt: saved.verifiedAt, expiresAt: saved.expiresAt }, user: publicUser(user) });
});

app.get('/api/status', (req, res) => {
  const user = userByToken(tokenOf(req));
  const out = {};
  for (const v of Object.keys(VENUES)) out[v] = {};
  if (user?.region) {
    const prefix = `${user.region.id}:`;
    for (const [key, room] of rooms) {
      if (!key.startsWith(prefix)) continue;
      const [, venue, table] = key.split(':');
      if (out[venue]) out[venue][table] = room.members.size;
    }
  }
  res.json({
    venues: VENUES,
    maxTable: MAX_TABLE,
    region: user?.region ? { id: user.region.id, name: user.region.name } : null,
    occupancy: out,
  });
});

app.post('/api/report', (req, res) => {
  const user = requireUser(req, res);
  if (!user) return;
  const result = addReport({
    reporterId: user.id,
    targetId: String(req.body?.targetId || ''),
    reason: String(req.body?.reason || ''),
    detail: req.body?.detail,
  });
  if (!result.ok) return res.status(400).json(result);
  if (result.suspended) kick(String(req.body.targetId), '신고가 누적되어 이용이 제한됐어요');
  res.json({ ok: true, count: result.count, suspended: result.suspended });
});

app.post('/api/block', (req, res) => {
  const user = requireUser(req, res);
  if (!user) return;
  const result = blockUser(user.id, String(req.body?.targetId || ''));
  if (!result.ok) return res.status(400).json(result);
  res.json({ ok: true });
});

app.post('/api/rate', (req, res) => {
  const user = requireUser(req, res);
  if (!user) return;
  const result = rateUser(user.id, String(req.body?.targetId || ''), String(req.body?.score || ''));
  if (!result.ok) return res.status(400).json(result);
  res.json(result);
});

app.post('/api/admin/login', (req, res) => {
  if (!ADMIN_PASSWORD) return res.status(503).json({ error: '관리자 비밀번호가 설정되지 않았어요' });
  if (String(req.body?.password || '') !== ADMIN_PASSWORD) return res.status(401).json({ error: '비밀번호가 맞지 않아요' });
  const token = crypto.randomBytes(24).toString('hex');
  adminSessions.set(token, Date.now() + 12 * 60 * 60 * 1000);
  res.json({ token });
});

app.get('/api/admin/reports', (req, res) => {
  if (!requireAdmin(req, res)) return;
  res.json({ reports: listReports(), suspended: listSuspended(), reasons: REPORT_REASONS });
});

app.post('/api/admin/unsuspend', (req, res) => {
  if (!requireAdmin(req, res)) return;
  const result = unsuspend(String(req.body?.userId || ''));
  if (!result.ok) return res.status(404).json(result);
  res.json(result);
});

const rooms = new Map();
let nextConn = 1;
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws', maxPayload: 64 * 1024 });
const send = (ws, obj) => { if (ws.readyState === 1) ws.send(JSON.stringify(obj)); };

function trackSocket(userId, ws) {
  let set = liveSockets.get(userId);
  if (!set) { set = new Set(); liveSockets.set(userId, set); }
  set.add(ws);
}
function untrackSocket(userId, ws) {
  const set = liveSockets.get(userId);
  if (!set) return;
  set.delete(ws);
  if (set.size === 0) liveSockets.delete(userId);
}
function kick(userId, message) {
  const set = liveSockets.get(userId);
  if (!set) return;
  for (const ws of set) send(ws, { type: 'error', message });
  for (const ws of set) { try { ws.close(); } catch { /* already closing */ } }
}

function peerView(member) {
  return { nick: member.nick, avatar: member.avatar, userId: member.userId, manner: member.manner };
}

wss.on('connection', (ws) => {
  const connId = String(nextConn++);
  let roomKey = null;
  let user = null;

  const peerOf = () => {
    const room = rooms.get(roomKey);
    if (!room) return null;
    for (const [pid, member] of room.members) if (pid !== connId) return { id: pid, ...member };
    return null;
  };

  const leave = () => {
    if (user) untrackSocket(user.id, ws);
    if (!roomKey) return;
    const room = rooms.get(roomKey);
    if (room) {
      room.members.delete(connId);
      room.likes.clear();
      room.again.clear();
      room.contactOpen = false;
      for (const [, member] of room.members) send(member.ws, { type: 'peer-left' });
      if (room.members.size === 0) rooms.delete(roomKey);
    }
    roomKey = null;
  };

  ws.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }
    if (msg.type === 'join') {
      if (roomKey) return;
      user = userByToken(msg.token);
      const blocked = entryBlock(user);
      if (blocked) return send(ws, { type: 'error', message: blocked });
      const venue = String(msg.venue || '');
      const table = parseInt(msg.table, 10);
      if (!VENUES[venue] || !(table >= 1 && table <= MAX_TABLE)) return send(ws, { type: 'error', message: '장소나 테이블 번호가 올바르지 않아요' });
      const nick = String(msg.nick || user.nick || '익명').slice(0, 16);
      const avatar = typeof msg.avatar === 'object' && msg.avatar ? msg.avatar : {};
      const key = `${user.region.id}:${venue}:${table}`;
      let room = rooms.get(key);
      if (!room) { room = { members: new Map(), likes: new Set(), again: new Set(), contactOpen: false }; rooms.set(key, room); }
      if (room.members.size >= 2) return send(ws, { type: 'full', message: '테이블이 꽉 찼어요' });
      for (const [, member] of room.members) {
        if (isBlocked(user.id, member.userId)) return send(ws, { type: 'error', message: '차단한 사용자와는 같은 테이블에 앉을 수 없어요' });
      }
      roomKey = key;
      trackSocket(user.id, ws);
      const existing = peerOf();
      room.members.set(connId, { ws, nick, avatar, userId: user.id, manner: user.manner });
      send(ws, {
        type: 'joined', id: connId, venue, table,
        region: { id: user.region.id, name: user.region.name },
        peer: existing ? peerView(existing) : null,
        initiator: !!existing,
      });
      if (existing) send(existing.ws, { type: 'peer-joined', peer: { nick, avatar, userId: user.id, manner: user.manner } });
      return;
    }
    if (!roomKey || !user) return;
    const peer = peerOf();
    const room = rooms.get(roomKey);
    switch (msg.type) {
      case 'motion':
      case 'signal':
        if (peer) send(peer.ws, { type: msg.type, data: msg.data });
        break;
      case 'chat': {
        const text = String(msg.text || '').trim().slice(0, 200);
        if (!text || !peer) break;
        const kind = contactKind(text);
        if (kind) {
          send(ws, { type: 'chat-blocked', kind });
          break;
        }
        send(peer.ws, { type: 'chat', from: room.members.get(connId)?.nick || user.nick, text });
        send(ws, { type: 'chat', from: '나', text, mine: true });
        break;
      }
      case 'contact': {
        if (!room?.contactOpen || !peer) {
          send(ws, { type: 'chat-blocked', kind: 'locked' });
          break;
        }
        const text = String(msg.text || '').trim().slice(0, 80);
        if (!text) break;
        send(peer.ws, { type: 'contact', from: room.members.get(connId)?.nick || user.nick, text });
        send(ws, { type: 'contact', from: '나', text, mine: true });
        break;
      }
      case 'like': {
        if (!room || !peer) break;
        room.likes.add(connId);
        if (room.likes.has(peer.id)) {
          for (const [, member] of room.members) send(member.ws, { type: 'match' });
        } else send(peer.ws, { type: 'peer-liked' });
        break;
      }
      case 'again': {
        if (!room || !peer) break;
        room.again.add(connId);
        if (room.again.has(peer.id)) {
          room.contactOpen = true;
          for (const [, member] of room.members) send(member.ws, { type: 'contact-open' });
        } else send(peer.ws, { type: 'peer-again' });
        break;
      }
      case 'leave':
        leave();
        break;
      default:
        break;
    }
  });
  ws.on('close', leave);
  ws.on('error', leave);
});

setInterval(() => { for (const c of wss.clients) if (c.readyState === 1) c.ping(); }, 20000);

server.listen(PORT, () => console.log(`blind-date-proto listening on :${PORT}`));
