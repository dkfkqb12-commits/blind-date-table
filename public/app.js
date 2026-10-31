import { drawAvatar, STYLES, SKINS, OUTFITS, NEUTRAL, encode, decode, lerpState } from './avatar.js';
import { VENUES, drawBackground, drawTable } from './venue.js';

const MP_VER = '0.10.21';
const MP_URL = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MP_VER}`;
const MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';
const SEND_HZ = 20;

const $ = (id) => document.getElementById(id);
const S = window.__app = {
  venue: 'cafe', look: JSON.parse(localStorage.getItem('look') || 'null') || { style: 'monk', skin: SKINS[0], outfit: OUTFITS[0] },
  ws: null, pc: null, joined: false, peer: null, initiator: false,
  self: { ...NEUTRAL }, selfShown: { ...NEUTRAL },
  partnerTarget: { ...NEUTRAL }, partnerShown: { ...NEUTRAL }, lastPartnerMotion: 0,
  tracking: false, faceSeen: false, liked: false, micOn: true, errors: [],
  stats: { sent: 0, recv: 0, detections: 0 },
};
window.addEventListener('error', (e) => S.errors.push(String(e.message)));
window.addEventListener('unhandledrejection', (e) => S.errors.push(String(e.reason)));

// ---------------- entry screen ----------------
$('nick').value = localStorage.getItem('nick') || '';
const params = new URLSearchParams(location.search);
if (params.get('venue') && VENUES[params.get('venue')]) S.venue = params.get('venue');
if (params.get('table')) $('table').value = params.get('table');

function renderVenues() {
  $('venues').innerHTML = Object.entries(VENUES).map(([k, v]) =>
    `<div class="venue ${k === S.venue ? 'sel' : ''}" data-v="${k}"><div class="e">${v.emoji}</div><div class="n">${v.name}</div><div class="d">${v.desc}</div></div>`).join('');
}
$('venues').addEventListener('click', (e) => {
  const el = e.target.closest('.venue'); if (!el) return;
  S.venue = el.dataset.v; renderVenues(); refreshOcc();
});
document.querySelectorAll('.step').forEach(b => b.addEventListener('click', () => {
  const t = $('table'); t.value = Math.min(20, Math.max(1, (+t.value || 1) + +b.dataset.d)); refreshOcc();
}));
$('table').addEventListener('input', refreshOcc);

let occData = null;
async function refreshOcc() {
  try { if (!occData || Date.now() - occData.t > 3000) occData = { t: Date.now(), d: await (await fetch('/api/status')).json() }; } catch { return; }
  const n = occData.d.occupancy[S.venue]?.[$('table').value] || 0;
  $('occ').textContent = n === 0 ? '빈 테이블' : n === 1 ? '🙋 1명 기다리는 중' : '🚫 꽉 참';
}

function renderLookOpts() {
  $('styleOpts').innerHTML = Object.entries(STYLES).map(([k, v]) => `<button type="button" class="chip ${S.look.style === k ? 'sel' : ''}" data-k="style" data-v="${k}">${v}</button>`).join('');
  $('skinOpts').innerHTML = SKINS.map(c => `<button type="button" class="sw ${S.look.skin === c ? 'sel' : ''}" style="background:${c}" data-k="skin" data-v="${c}"></button>`).join('');
  $('outfitOpts').innerHTML = OUTFITS.map(c => `<button type="button" class="sw ${S.look.outfit === c ? 'sel' : ''}" style="background:${c}" data-k="outfit" data-v="${c}"></button>`).join('');
}
document.querySelector('.opts').addEventListener('click', (e) => {
  const b = e.target.closest('[data-k]'); if (!b) return;
  S.look[b.dataset.k] = b.dataset.v; localStorage.setItem('look', JSON.stringify(S.look)); renderLookOpts();
});
renderVenues(); renderLookOpts(); refreshOcc();

// idle animation for the edit preview
const edit = $('editPreview').getContext('2d');
function editLoop(t) {
  if (!$('entry').classList.contains('active')) return;
  edit.clearRect(0, 0, 220, 220);
  const idle = { ...NEUTRAL, blinkL: blinkCurve(t), blinkR: blinkCurve(t), yaw: Math.sin(t / 1400) * 0.3, roll: Math.sin(t / 1900) * 0.12, smile: 0.5 + Math.sin(t / 2300) * 0.3 };
  drawAvatar(edit, 110, 110, 230, idle, S.look, { time: t });
  requestAnimationFrame(editLoop);
}
requestAnimationFrame(editLoop);
function blinkCurve(t) { const p = t % 3800; return p < 140 ? Math.sin((p / 140) * Math.PI) : 0; }

// ---------------- media ----------------
let camStream = null, micStream = null;
async function getMedia() {
  const msgs = [];
  try {
    const st = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    });
    camStream = new MediaStream(st.getVideoTracks());
    micStream = new MediaStream(st.getAudioTracks());
  } catch (e) {
    // try separately so one denial doesn't block the other
    try { camStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } }); } catch { msgs.push('카메라'); }
    try { micStream = await navigator.mediaDevices.getUserMedia({ audio: true }); } catch { msgs.push('마이크'); }
  }
  return msgs;
}

// ---------------- face tracking (local only) ----------------
let landmarker = null, calib = { n: 0, pitch: 0 };
async function startTracking() {
  if (!camStream) { $('trackState').textContent = '카메라 없음'; return; }
  const video = $('cam');
  video.srcObject = camStream;
  await video.play().catch(() => {});
  $('trackState').textContent = '얼굴 인식 모델 불러오는 중…';
  try {
    const { FaceLandmarker, FilesetResolver } = await import(`${MP_URL}/vision_bundle.mjs`);
    const fileset = await FilesetResolver.forVisionTasks(`${MP_URL}/wasm`);
    const make = (delegate) => FaceLandmarker.createFromOptions(fileset, {
      baseOptions: { modelAssetPath: MODEL_URL, delegate },
      runningMode: 'VIDEO', numFaces: 1, outputFaceBlendshapes: true,
    });
    try { landmarker = await make('GPU'); } catch { landmarker = await make('CPU'); }
  } catch (e) {
    S.errors.push('mediapipe: ' + e); $('trackState').textContent = '얼굴 인식 불가'; return;
  }
  S.tracking = true;
  let lastDetect = 0, lastSend = 0;
  const loop = () => {
    if (!S.tracking) return;
    const now = performance.now();
    if (video.readyState >= 2 && now - lastDetect >= 1000 / 30) {
      lastDetect = now;
      let res = null;
      try { res = landmarker.detectForVideo(video, now); } catch (e) { S.errors.push('detect: ' + e); }
      if (res && res.faceLandmarks && res.faceLandmarks.length) {
        S.stats.detections++;
        S.faceSeen = true;
        const tgt = extract(res, video.videoWidth, video.videoHeight);
        lerpState(S.self, tgt, 0.6);
        $('trackState').textContent = '😊 표정 따라하는 중';
      } else if (S.faceSeen) {
        $('trackState').textContent = '얼굴이 안 보여요';
      } else $('trackState').textContent = '얼굴을 화면에 보여주세요';
      if (now - lastSend >= 1000 / SEND_HZ && res && res.faceLandmarks?.length) { lastSend = now; sendMotion(); }
    }
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}

const remap = (v, a, b) => Math.max(0, Math.min(1, (v - a) / (b - a)));
function extract(res, vw, vh) {
  const L = res.faceLandmarks[0];
  const bs = {};
  (res.faceBlendshapes?.[0]?.categories || []).forEach(c => bs[c.categoryName] = c.score);
  const P = (i) => ({ x: L[i].x * vw, y: L[i].y * vh });
  const nose = P(1), le = P(234), re = P(454), top = P(10), chin = P(152), eR = P(33), eL = P(263);
  // camera image is un-mirrored: subject's left is image right (+x)
  const half = Math.max(1, (re.x - le.x) / 2);
  const yaw = ((nose.x - (le.x + re.x) / 2) / half) * 1.2;
  const r = (nose.y - top.y) / Math.max(1, chin.y - top.y);
  if (calib.n < 20) { calib.pitch = (calib.pitch * calib.n + r) / (calib.n + 1); calib.n++; }
  const pitch = (r - calib.pitch) * 5;
  const roll = Math.atan2(eL.y - eR.y, eL.x - eR.x);
  const g = (k) => bs[k] || 0;
  const lookX = ((g('eyeLookOutLeft') + g('eyeLookInRight')) - (g('eyeLookInLeft') + g('eyeLookOutRight'))) / 2;
  const lookY = ((g('eyeLookUpLeft') + g('eyeLookUpRight')) - (g('eyeLookDownLeft') + g('eyeLookDownRight'))) / 2;
  return {
    blinkL: remap(g('eyeBlinkLeft'), 0.25, 0.6),
    blinkR: remap(g('eyeBlinkRight'), 0.25, 0.6),
    jaw: remap(g('jawOpen'), 0.06, 0.55),
    smile: remap((g('mouthSmileLeft') + g('mouthSmileRight')) / 2, 0.1, 0.65),
    browUp: remap(Math.max(g('browInnerUp'), (g('browOuterUpLeft') + g('browOuterUpRight')) / 2), 0.15, 0.7),
    browDown: remap((g('browDownLeft') + g('browDownRight')) / 2, 0.1, 0.5),
    pucker: remap(g('mouthPucker'), 0.3, 0.85),
    yaw: Math.max(-1, Math.min(1, yaw)), pitch: Math.max(-1, Math.min(1, pitch)), roll,
    lookX: Math.max(-1, Math.min(1, lookX * 2)), lookY: Math.max(-1, Math.min(1, lookY * 2)),
  };
}

function sendMotion() {
  if (!S.ws || S.ws.readyState !== 1 || !S.peer) return;
  S.ws.send(JSON.stringify({ type: 'motion', data: encode(S.self) }));
  S.stats.sent++;
}

// ---------------- WebRTC (audio only) ----------------
const ICE = { iceServers: [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }] };
let pendingCand = [];
function createPC() {
  closePC();
  const pc = S.pc = new RTCPeerConnection(ICE);
  const tr = micStream?.getAudioTracks()[0];
  if (tr) pc.addTrack(tr, micStream); else pc.addTransceiver('audio', { direction: 'recvonly' });
  // NOTE: camera video track is intentionally NEVER added.
  pc.onicecandidate = (e) => { if (e.candidate) { S.stats.candSent = (S.stats.candSent || 0) + 1; signal({ cand: e.candidate }); } };
  pc.ontrack = (e) => {
    const a = $('remoteAudio'); a.srcObject = e.streams[0] || new MediaStream([e.track]);
    a.play().then(() => $('unmuteBtn').classList.add('hidden')).catch(() => $('unmuteBtn').classList.remove('hidden'));
  };
  pc.onconnectionstatechange = () => { S.rtcState = pc.connectionState; };
  return pc;
}
function closePC() { if (S.pc) { try { S.pc.close(); } catch {} S.pc = null; } pendingCand = []; }
function signal(data) { if (S.ws?.readyState === 1) S.ws.send(JSON.stringify({ type: 'signal', data })); }
async function onSignal(d) {
  try {
    if (d.sdp) {
      if (d.sdp.type === 'offer') {
        const pc = createPC();
        await pc.setRemoteDescription(d.sdp);
        await pc.setLocalDescription(await pc.createAnswer());
        signal({ sdp: pc.localDescription });
      } else if (S.pc) await S.pc.setRemoteDescription(d.sdp);
      for (const c of pendingCand.splice(0)) await S.pc.addIceCandidate(c).catch(() => {});
    } else if (d.cand) {
      S.stats.candRecv = (S.stats.candRecv || 0) + 1;
      if (S.pc?.remoteDescription) await S.pc.addIceCandidate(d.cand).catch(() => {});
      else pendingCand.push(d.cand);
    }
  } catch (e) { S.errors.push('rtc: ' + e); }
}
async function startCall() {
  const pc = createPC();
  await pc.setLocalDescription(await pc.createOffer());
  signal({ sdp: pc.localDescription });
}

// ---------------- signaling / room ----------------
function connect(join) {
  return new Promise((resolve) => {
    const ws = S.ws = new WebSocket(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws`);
    ws.onopen = () => ws.send(JSON.stringify({ type: 'join', ...join }));
    ws.onmessage = (ev) => {
      const m = JSON.parse(ev.data);
      switch (m.type) {
        case 'full': resolve('full'); ws.close(); break;
        case 'error': resolve(m.message); ws.close(); break;
        case 'joined':
          S.joined = true; S.initiator = m.initiator; resolve('ok');
          if (m.peer) { setPeer(m.peer); startCall(); }
          break;
        case 'peer-joined': setPeer(m.peer); break;
        case 'peer-left': setPeer(null); closePC(); toast('상대가 나갔어요'); break;
        case 'signal': onSignal(m.data); break;
        case 'motion': S.partnerTarget = decode(m.data); S.lastPartnerMotion = performance.now(); S.stats.recv++; break;
        case 'peer-liked': toast('상대가 💗를 눌렀어요!'); break;
        case 'match': $('match').classList.remove('hidden'); break;
      }
    };
    ws.onclose = () => { if (S.joined) { toast('서버 연결이 끊겼어요'); } resolve('closed'); };
  });
}
function setPeer(p) {
  S.peer = p; S.liked = false;
  $('likeBtn').classList.remove('done'); $('likeBtn').textContent = '💗 마음에 들어요';
  $('waiting').classList.toggle('hidden', !!p);
  $('partnerTag').textContent = p ? p.nick : '';
  S.partnerTarget = { ...NEUTRAL }; S.partnerShown = { ...NEUTRAL };
  if (p) toast(`${p.nick}님이 앉았어요`);
}
let toastT;
function toast(text) { const t = $('peerLiked'); t.textContent = text; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 2500); }

$('enterBtn').addEventListener('click', async () => {
  const nick = $('nick').value.trim();
  const table = parseInt($('table').value, 10);
  if (!nick) { $('entryMsg').textContent = '닉네임을 입력해주세요'; return; }
  if (!(table >= 1 && table <= 20)) { $('entryMsg').textContent = '테이블 번호는 1~20 사이예요'; return; }
  localStorage.setItem('nick', nick);
  $('entryMsg').textContent = ''; $('enterBtn').disabled = true; $('enterBtn').textContent = '입장하는 중…';
  if (!camStream && !micStream) {
    const denied = await getMedia();
    if (denied.length) $('entryMsg').textContent = `${denied.join('·')} 권한이 없어요. 그래도 입장할게요.`;
  }
  const r = await connect({ venue: S.venue, table, nick, avatar: S.look });
  $('enterBtn').disabled = false; $('enterBtn').textContent = '카메라 켜고 입장하기';
  if (r === 'full') { $('fullModal').classList.remove('hidden'); occData = null; refreshOcc(); return; }
  if (r !== 'ok') { $('entryMsg').textContent = typeof r === 'string' && r !== 'closed' ? r : '서버에 연결하지 못했어요'; return; }
  enterRoom(table);
});
$('fullOk').onclick = () => $('fullModal').classList.add('hidden');

function enterRoom(table) {
  $('entry').classList.remove('active'); $('room').classList.add('active');
  $('roomTitle').textContent = `${VENUES[S.venue].emoji} ${VENUES[S.venue].name} · ${table}번 테이블`;
  const w = $('when').value;
  $('roomWhen').textContent = w ? `⏰ 약속 ${new Date(w).toLocaleString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short', hour: 'numeric', minute: '2-digit' })}` : '';
  S.table = table;
  $('waiting').classList.toggle('hidden', !!S.peer);
  if (!S.tracking) startTracking();
  resize(); requestAnimationFrame(roomLoop);
}

$('leaveBtn').onclick = () => {
  if (S.ws) { try { S.ws.send(JSON.stringify({ type: 'leave' })); } catch {} S.joined = false; S.ws.close(); }
  closePC(); S.peer = null;
  $('match').classList.add('hidden');
  $('room').classList.remove('active'); $('entry').classList.add('active');
  occData = null; refreshOcc(); requestAnimationFrame(editLoop);
};
$('likeBtn').onclick = () => {
  if (!S.peer) { toast('아직 상대가 없어요'); return; }
  if (S.liked) return;
  S.liked = true; S.ws.send(JSON.stringify({ type: 'like' }));
  $('likeBtn').classList.add('done'); $('likeBtn').textContent = '💗 보냈어요';
};
$('micBtn').onclick = () => {
  S.micOn = !S.micOn;
  micStream?.getAudioTracks().forEach(t => t.enabled = S.micOn);
  $('micBtn').classList.toggle('off', !S.micOn); $('micBtn').textContent = S.micOn ? '🎤' : '🔇';
};
$('unmuteBtn').onclick = () => $('remoteAudio').play().then(() => $('unmuteBtn').classList.add('hidden')).catch(() => {});
$('matchOk').onclick = () => { $('match').querySelector('p').textContent = '좋아요! 실제 만남 약속은 서로 대화로 정해보세요 😊'; $('matchOk').classList.add('hidden'); };
$('matchClose').onclick = () => { $('match').classList.add('hidden'); $('matchOk').classList.remove('hidden'); $('match').querySelector('p').textContent = '실제로 만나볼까요?'; };

// ---------------- rendering ----------------
const scene = $('scene'), sctx = scene.getContext('2d');
const selfC = $('selfPreview'), selfCtx = selfC.getContext('2d');
let W = 0, H = 0, DPR = 1;
function resize() {
  DPR = Math.min(2, window.devicePixelRatio || 1);
  W = scene.clientWidth; H = scene.clientHeight;
  scene.width = W * DPR; scene.height = H * DPR;
}
window.addEventListener('resize', resize);

function drawChair(ctx, cx, cy, size, venue) {
  const c = { cafe: '#8b5e3c', restaurant: '#5a1e28', bar: '#3a2c55' }[venue];
  ctx.fillStyle = c;
  ctx.beginPath(); ctx.roundRect(cx - size * 0.32, cy - size * 0.55, size * 0.64, size * 0.75, 20); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  ctx.beginPath(); ctx.roundRect(cx - size * 0.26, cy - size * 0.49, size * 0.52, size * 0.6, 14); ctx.fill();
}

function roomLoop(t) {
  if (!$('room').classList.contains('active')) return;
  sctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  drawBackground(sctx, W, H, S.venue, t);
  const avSize = Math.min(W * 0.72, H * 0.4);
  const k = avSize / 260;
  const ax = W / 2, ay = H * 0.7 - 205 * k; // hands rest on the table top
  drawChair(sctx, ax, ay + avSize * 0.2, avSize * 1.05, S.venue);
  if (S.peer) {
    // smooth partner motion; if stale (>1s) fall back to idle with auto-blink
    const stale = performance.now() - S.lastPartnerMotion > 1000;
    const tgt = stale ? { ...NEUTRAL, blinkL: blinkCurve(t), blinkR: blinkCurve(t), yaw: Math.sin(t / 1700) * 0.15 } : S.partnerTarget;
    lerpState(S.partnerShown, tgt, stale ? 0.08 : 0.35);
    drawAvatar(sctx, ax, ay, avSize, S.partnerShown, S.peer.avatar, { time: t });
  }
  drawTable(sctx, W, H, S.venue, S.table);

  // self preview (mirrored like a selfie)
  selfCtx.clearRect(0, 0, 240, 240);
  const me = S.faceSeen ? S.self : { ...NEUTRAL, blinkL: blinkCurve(t), blinkR: blinkCurve(t) };
  lerpState(S.selfShown, me, 0.5);
  drawAvatar(selfCtx, 120, 128, 250, S.selfShown, S.look, { time: t, mirror: true });
  requestAnimationFrame(roomLoop);
}
