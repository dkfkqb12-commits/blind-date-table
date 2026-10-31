import {
  drawAvatar, NEUTRAL, HAIRS, HAIR_COLORS, SKINS, EYES, EYE_COLORS, BROWS,
  OUTFITS, OUTFIT_COLORS, GLASSES, EARRINGS, HATS, normalizeLook, encode, decode,
  lerpState, POSE_KEYS, HAND_L_KEYS, HAND_R_KEYS,
} from './avatar.js';
import { VENUES, drawBackground, drawTable } from './venue.js';
import { extractFace, extractPose, extractHands, fingersFromPose } from './tracking.js';
import { initGate, api, authHeaders } from './gate.js';

const MP_VER = '0.10.21';
const MP_URL = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MP_VER}`;
const FACE_URL = 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';
const POSE_URL = 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task';
const HAND_URL = 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';
const SEND_HZ = 18;

const $ = (id) => document.getElementById(id);
const S = window.__app = {
  venue: 'cafe',
  look: loadLook(),
  ws: null, pc: null, joined: false, peer: null, initiator: false,
  self: { ...NEUTRAL }, selfShown: { ...NEUTRAL },
  partnerTarget: { ...NEUTRAL }, partnerShown: { ...NEUTRAL }, lastPartnerMotion: 0,
  tracking: false, faceAt: 0, poseAt: 0, handLAt: 0, handRAt: 0, lastFresh: 0,
  liked: false, again: false, rated: false, micOn: true, errors: [], modelNote: '',
  user: null, maxTable: 30, rateTarget: null,
  models: null,
  frames: 0,
  stats: { sent: 0, recv: 0, detections: 0 },
};
window.addEventListener('error', (e) => S.errors.push(String(e.message)));
window.addEventListener('unhandledrejection', (e) => S.errors.push(String(e.reason && e.reason.message || e.reason)));

function loadLook() {
  let raw = null;
  try { raw = JSON.parse(localStorage.getItem('look') || 'null'); } catch { /* ignore broken storage */ }
  return normalizeLook(raw || {});
}

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
document.querySelectorAll('.step').forEach((b) => b.addEventListener('click', () => {
  const t = $('table');
  const max = S.maxTable || 30;
  t.value = Math.min(max, Math.max(1, (+t.value || 1) + +b.dataset.d));
  refreshOcc();
}));
$('table').addEventListener('input', refreshOcc);

let occData = null;
async function refreshOcc() {
  try {
    if (!occData || Date.now() - occData.t > 3000) {
      occData = { t: Date.now(), d: await (await fetch('/api/status', { headers: authHeaders() })).json() };
    }
  } catch { return; }
  if (occData.d.maxTable) { S.maxTable = occData.d.maxTable; $('table').max = S.maxTable; }
  const n = occData.d.occupancy?.[S.venue]?.[$('table').value] || 0;
  $('occ').textContent = n === 0 ? '빈 테이블' : n === 1 ? '🙋 1명 기다리는 중' : '🚫 꽉 참';
}

const LOOK_SECTIONS = [
  ['hair', '헤어', 'chips', HAIRS],
  ['hairColor', '머리색', 'swatch', HAIR_COLORS],
  ['skin', '피부', 'swatch', SKINS],
  ['eye', '눈', 'chips', EYES],
  ['eyeColor', '눈동자', 'swatch', EYE_COLORS],
  ['brow', '눈썹', 'chips', BROWS],
  ['outfit', '옷', 'chips', OUTFITS],
  ['outfitColor', '옷 색', 'swatch', OUTFIT_COLORS],
  ['glasses', '안경', 'chips', GLASSES],
  ['earrings', '귀걸이', 'chips', EARRINGS],
  ['hat', '모자', 'chips', HATS],
];

function renderLookOpts() {
  $('lookOpts').innerHTML = LOOK_SECTIONS.map(([key, label, type, opts]) => {
    const cur = S.look[key];
    const body = type === 'chips'
      ? `<div class="chips">${Object.entries(opts).map(([k, name]) =>
        `<button type="button" class="chip ${cur === k ? 'sel' : ''}" data-k="${key}" data-v="${k}">${name}</button>`).join('')}</div>`
      : `<div class="swatches">${opts.map((c) =>
        `<button type="button" class="sw ${cur === c ? 'sel' : ''}" style="background:${c}" data-k="${key}" data-v="${c}" aria-label="${c}"></button>`).join('')}</div>`;
    return `<div class="look-sec"><div class="sub">${label}</div>${body}</div>`;
  }).join('');
}
$('lookOpts').addEventListener('click', (e) => {
  const b = e.target.closest('[data-k]'); if (!b) return;
  S.look = normalizeLook({ ...S.look, [b.dataset.k]: b.dataset.v });
  localStorage.setItem('look', JSON.stringify(S.look));
  renderLookOpts();
});
renderVenues(); renderLookOpts(); refreshOcc();

const editC = $('editPreview');
const editCtx = editC.getContext('2d');
function editLoop(t) {
  if (!$('entry').classList.contains('active')) return;
  paintBust(editCtx, editC.width, editC.height, idleState(t), S.look, t, false);
  requestAnimationFrame(editLoop);
}
requestAnimationFrame(editLoop);
function blinkCurve(t) { const p = t % 3800; return p < 140 ? Math.sin((p / 140) * Math.PI) : 0; }
function idleState(t) {
  return {
    ...NEUTRAL,
    blinkL: blinkCurve(t), blinkR: blinkCurve(t),
    yaw: Math.sin(t / 1600) * 0.16,
    roll: Math.sin(t / 2100) * 0.05,
    smile: 0.22 + Math.sin(t / 2400) * 0.08,
    lookX: Math.sin(t / 1900) * 0.22,
    uaL: NEUTRAL.uaL + Math.sin(t / 900) * 0.035,
    uaR: NEUTRAL.uaR + Math.sin(t / 1100) * 0.035,
  };
}

function paintBust(ctx, w, h, state, look, t, mirror) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, w, h);
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#fff8f5');
  g.addColorStop(0.62, '#ffe3ea');
  g.addColorStop(1, '#f0c7a4');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  const tableY = h * 0.78;
  const size = w * 0.94;
  const k = size / 400;
  const ay = tableY - 128 * k;
  ctx.fillStyle = 'rgba(120,72,48,0.22)';
  ctx.beginPath();
  ctx.roundRect(w / 2 - size * 0.3, ay - size * 0.08, size * 0.6, size * 0.42, 28);
  ctx.fill();
  drawAvatar(ctx, w / 2, ay, size, state, look, { time: t, mirror, pass: 'body' });
  ctx.fillStyle = '#e8c39a';
  ctx.beginPath();
  ctx.roundRect(w * 0.05, tableY, w * 0.9, h * 0.075, 16);
  ctx.fill();
  ctx.fillStyle = '#c48a58';
  ctx.fillRect(w * 0.09, tableY + h * 0.06, w * 0.82, Math.max(4, h * 0.018));
  drawAvatar(ctx, w / 2, ay, size, state, look, { time: t, mirror, pass: 'limbs' });
}

// ---------------- media ----------------
let camStream = null, micStream = null;
async function getMedia() {
  const msgs = [];
  const video = {
    facingMode: 'user',
    width: { ideal: 480 },
    height: { ideal: 640 },
  };
  try {
    const st = await navigator.mediaDevices.getUserMedia({
      video,
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    });
    camStream = new MediaStream(st.getVideoTracks());
    micStream = new MediaStream(st.getAudioTracks());
  } catch {
    try { camStream = await navigator.mediaDevices.getUserMedia({ video }); } catch { msgs.push('카메라'); }
    try { micStream = await navigator.mediaDevices.getUserMedia({ audio: true }); } catch { msgs.push('마이크'); }
  }
  return msgs;
}

// ---------------- face / pose / hands (local only) ----------------
let faceLm = null, poseLm = null, handLm = null;
const calib = { n: 0, pitch: 0 };
let lastSend = 0;
let gap = 1000 / 18;
let lastStamp = 0;
let handTick = 0;

async function makeLandmarker(Cls, url, extra) {
  const build = (delegate) => Cls.createFromOptions(S._fileset, {
    baseOptions: { modelAssetPath: url, delegate },
    runningMode: 'VIDEO',
    ...extra,
  });
  try { return await build('GPU'); } catch { return await build('CPU'); }
}

function safeDetect(lm, video, stamp) {
  if (!lm) return null;
  try { return lm.detectForVideo(video, stamp); } catch (e) {
    if (!S.modelNote) S.modelNote = String(e && e.message || e);
    return null;
  }
}

async function startTracking() {
  if (S.tracking) return;
  if (!camStream) { setTrack('카메라 없음 · 기본 자세로 보여요'); return; }
  S.tracking = true;
  const video = $('cam');
  video.srcObject = camStream;
  await video.play().catch(() => {});
  setTrack('표정 모델 불러오는 중…');
  try {
    const { FaceLandmarker, PoseLandmarker, HandLandmarker, FilesetResolver } = await import(`${MP_URL}/vision_bundle.mjs`);
    S._fileset = await FilesetResolver.forVisionTasks(`${MP_URL}/wasm`);
    try { faceLm = await makeLandmarker(FaceLandmarker, FACE_URL, { numFaces: 1, outputFaceBlendshapes: true }); } catch (e) { S.modelNote = 'face ' + e; }
    setTrack('자세 모델 불러오는 중…');
    try { poseLm = await makeLandmarker(PoseLandmarker, POSE_URL, { numPoses: 1 }); } catch (e) { S.modelNote += ' pose ' + e; }
    setTrack('손 모델 불러오는 중…');
    try {
      handLm = await makeLandmarker(HandLandmarker, HAND_URL, {
        numHands: 2,
        minHandDetectionConfidence: 0.3,
        minHandPresenceConfidence: 0.3,
        minTrackingConfidence: 0.3,
      });
    } catch (e) { S.modelNote += ' hand ' + e; }
  } catch (e) {
    S.modelNote = 'mediapipe ' + (e && e.message || e);
  }
  S.models = { face: !!faceLm, pose: !!poseLm, hands: !!handLm };
  if (!faceLm && !poseLm && !handLm) {
    setTrack('인식 모델을 쓰지 못해요 · 기본 자세');
    const hint = $('frameHint');
    if (hint) hint.textContent = '인식 모델을 불러오지 못했어요. 기본 자세로 보여 드릴게요.';
    return;
  }
  setTrack('얼굴과 손이 보이게 들어주세요');
  const loop = () => {
    if (!S.tracking) return;
    requestAnimationFrame(loop);
    const now = performance.now();
    if (video.readyState < 2 || now - lastStamp < gap) return;
    const stamp = Math.max(now, lastStamp + 1);
    lastStamp = stamp;
    const t0 = performance.now();
    const faceRes = safeDetect(faceLm, video, stamp);
    const poseRes = safeDetect(poseLm, video, stamp);
    const doHands = !!handLm && (gap < 72 || handTick++ % 2 === 0);
    const handRes = doHands ? safeDetect(handLm, video, stamp) : null;
    const elapsed = performance.now() - t0;
    if (elapsed > 68) gap = Math.min(1000 / 12, gap + 5);
    else if (elapsed < 42) gap = Math.max(1000 / 20, gap - 2);
    S.trackMs = elapsed;
    S.trackHz = Math.round(1000 / gap);
    applyDetections(faceRes, poseRes, handRes, video.videoWidth, video.videoHeight, now);
  };
  requestAnimationFrame(loop);
}

const FACE_KEYS = ['blinkL', 'blinkR', 'jaw', 'smile', 'browUp', 'browDown', 'pucker', 'yaw', 'pitch', 'roll', 'lookX', 'lookY'];

function applyDetections(faceRes, poseRes, handRes, vw, vh, now) {
  const target = { ...S.self };
  let fresh = false;
  if (faceRes?.faceLandmarks?.length) {
    Object.assign(target, extractFace(faceRes, vw, vh, calib));
    S.faceAt = now;
    S.stats.detections++;
    fresh = true;
  } else if (now - S.faceAt > 520) {
    const idle = idleState(now);
    for (const k of FACE_KEYS) target[k] = idle[k];
  }

  const poseLm = poseRes?.landmarks?.[0] || null;
  const pose = poseLm ? extractPose(poseLm) : null;
  if (pose) {
    for (const k of POSE_KEYS) if (pose[k] != null) target[k] = pose[k];
    S.poseAt = now;
    fresh = true;
  } else if (now - S.poseAt > 500) {
    for (const k of POSE_KEYS) target[k] = NEUTRAL[k];
  }

  const hands = extractHands(handRes, poseLm);
  const approx = poseLm ? fingersFromPose(poseLm) : null;
  const takeHand = (flag, keys, atName, prefix) => {
    if (hands[flag]) {
      for (const k of keys) if (hands[k] != null) target[k] = hands[k];
      S[atName] = now;
      fresh = true;
      return;
    }
    // Hold a real hand reading through brief dropouts. Pose fingertips are only a fallback.
    if (S[atName] && now - S[atName] < 450) return;
    if (approx && approx[`c${prefix}1`] != null && now - (S.poseAt || 0) < 500) {
      for (const k of keys) if (k !== flag && approx[k] != null) target[k] = approx[k];
      fresh = true;
    } else if (now - S[atName] > 500) {
      for (const k of keys) target[k] = NEUTRAL[k];
    }
  };
  takeHand('handL', HAND_L_KEYS, 'handLAt', 'L');
  takeHand('handR', HAND_R_KEYS, 'handRAt', 'R');

  lerpState(S.self, target, 0.62);
  setTrack(trackText(now));
  const hint = $('frameHint');
  if (hint && (S.handLAt || S.handRAt)) hint.classList.add('hidden');
  if (S.peer && (fresh || now - S.lastFresh < 700) && now - lastSend >= 1000 / SEND_HZ) {
    lastSend = now;
    if (fresh) S.lastFresh = now;
    sendMotion();
  }
}

function trackText(now) {
  const face = now - S.faceAt < 650;
  const pose = now - S.poseAt < 650;
  const hand = now - S.handLAt < 650 || now - S.handRAt < 650;
  if (S.models && !S.models.face && !S.models.pose && !S.models.hands) return '인식 모델 없음 · 기본 자세';
  if (face && hand) return '😊 표정·손 따라하는 중';
  if (face && pose) return '손은 잘 안 보여요 · 조금 더 멀리';
  if (face) return '😊 표정 따라하는 중';
  if (pose) return '얼굴이 안 보여요';
  return '얼굴과 손이 보이게 들어주세요';
}
function setTrack(text) {
  const el = $('trackState');
  if (el && el.textContent !== text) el.textContent = text;
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
function closePC() { if (S.pc) { try { S.pc.close(); } catch { /* already closed */ } S.pc = null; } pendingCand = []; }
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
        case 'chat': addChat(m); break;
        case 'chat-blocked': addChat({ system: true, text: m.kind === 'locked' ? '서로 또 만나고 싶어요를 누른 뒤에 연락처를 보낼 수 있어요.' : '연락처·링크는 채팅으로 보낼 수 없어요. 서로 또 만나고 싶어요를 누르면 교환할 수 있어요.' }); break;
        case 'peer-again': toast('상대도 또 만나고 싶어해요'); break;
        case 'contact-open': $('contactBox').classList.remove('hidden'); toast('연락처를 교환할 수 있어요'); break;
        case 'contact': addChat({ system: true, text: `${m.from}: ${m.text}` }); break;
      }
    };
    ws.onclose = () => { if (S.joined) { toast('서버 연결이 끊겼어요'); } resolve('closed'); };
  });
}
function setPeer(p) {
  S.peer = p; S.liked = false; S.again = false;
  $('likeBtn').classList.remove('done'); $('likeBtn').textContent = '💗 마음에 들어요';
  $('againBtn').classList.remove('done');
  $('waiting').classList.toggle('hidden', !!p);
  $('partnerTag').textContent = p ? `${p.nick}${p.manner != null ? ` · ${Number(p.manner).toFixed(1)}°` : ''}` : '';
  S.partnerTarget = { ...NEUTRAL }; S.partnerShown = { ...NEUTRAL }; S.lastPartnerMotion = 0;
  if (p) { S.metPeer = p; S.rated = false; toast(`${p.nick}님이 앉았어요`); }
}
let toastT;
function toast(text) { const t = $('peerLiked'); t.textContent = text; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 2500); }

$('enterBtn').addEventListener('click', async () => {
  const nick = $('nick').value.trim();
  const table = parseInt($('table').value, 10);
  if (!nick) { $('entryMsg').textContent = '닉네임을 입력해주세요'; return; }
  const max = S.maxTable || 30;
  if (!(table >= 1 && table <= max)) { $('entryMsg').textContent = `테이블 번호는 1~${max} 사이예요`; return; }
  localStorage.setItem('nick', nick);
  localStorage.setItem('look', JSON.stringify(S.look));
  $('entryMsg').textContent = ''; $('enterBtn').disabled = true; $('enterBtn').textContent = '입장하는 중…';
  if (!camStream && !micStream) {
    const denied = await getMedia();
    if (denied.length) $('entryMsg').textContent = `${denied.join('·')} 권한이 없어요. 그래도 입장할게요.`;
  }
  const r = await connect({ venue: S.venue, table, nick, avatar: S.look, token: localStorage.getItem('btToken') });
  $('enterBtn').disabled = false; $('enterBtn').textContent = '카메라 켜고 입장하기';
  if (r === 'full') { $('fullModal').classList.remove('hidden'); occData = null; refreshOcc(); return; }
  if (r !== 'ok') { $('entryMsg').textContent = typeof r === 'string' && r !== 'closed' ? r : '서버에 연결하지 못했어요'; return; }
  enterRoom(table);
});
$('fullOk').onclick = () => $('fullModal').classList.add('hidden');

function enterRoom(table) {
  $('entry').classList.remove('active'); $('room').classList.add('active');
  const regionName = S.user?.region?.name ? `${S.user.region.name} · ` : '';
  $('roomTitle').textContent = `${regionName}${VENUES[S.venue].emoji} ${VENUES[S.venue].name} · ${table}번 테이블`;
  const w = $('when').value;
  $('roomWhen').textContent = w ? `⏰ 약속 ${new Date(w).toLocaleString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short', hour: 'numeric', minute: '2-digit' })}` : '';
  S.table = table;
  $('waiting').classList.toggle('hidden', !!S.peer);
  $('frameHint').classList.remove('hidden');
  if (!S.tracking) startTracking();
  resize(); requestAnimationFrame(roomLoop);
}

function doLeave() {
  if (S.ws) { try { S.ws.send(JSON.stringify({ type: 'leave' })); } catch { /* socket already gone */ } S.joined = false; S.ws.close(); }
  closePC(); S.peer = null;
  $('match').classList.add('hidden');
  $('contactBox').classList.add('hidden');
  $('chatPanel').classList.add('hidden');
  $('room').classList.remove('active'); $('entry').classList.add('active');
  occData = null; refreshOcc(); requestAnimationFrame(editLoop);
}
$('leaveBtn').onclick = () => {
  if (S.metPeer && !S.rated) { S.rateTarget = S.metPeer.userId; $('rateModal').classList.remove('hidden'); return; }
  doLeave();
};
$('likeBtn').onclick = () => {
  if (!S.peer) { toast('아직 상대가 없어요'); return; }
  if (S.liked) return;
  S.liked = true; S.ws.send(JSON.stringify({ type: 'like' }));
  $('likeBtn').classList.add('done'); $('likeBtn').textContent = '💗 보냈어요';
};
$('againBtn').onclick = () => {
  if (!S.peer) { toast('아직 상대가 없어요'); return; }
  if (S.again) return;
  S.again = true;
  S.ws.send(JSON.stringify({ type: 'again' }));
  $('againBtn').classList.add('done');
};
function addChat(m) {
  const log = $('chatLog');
  const line = document.createElement('div');
  if (m.system) line.className = 'sys';
  line.textContent = m.system ? m.text : `${m.from}: ${m.text}`;
  log.appendChild(line);
  log.scrollTop = log.scrollHeight;
  $('chatPanel').classList.remove('hidden');
}
$('chatToggle').onclick = () => $('chatPanel').classList.toggle('hidden');
$('chatForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const text = $('chatInput').value.trim();
  if (!text || !S.ws || S.ws.readyState !== 1) return;
  S.ws.send(JSON.stringify({ type: 'chat', text }));
  $('chatInput').value = '';
});
$('contactSend').onclick = () => {
  const text = $('contactInput').value.trim();
  if (!text || !S.ws || S.ws.readyState !== 1) return;
  S.ws.send(JSON.stringify({ type: 'contact', text }));
  $('contactInput').value = '';
};
$('reportBtn').onclick = () => {
  if (!S.peer) { toast('신고할 상대가 아직 없어요'); return; }
  $('reportModal').classList.remove('hidden');
};
$('reportClose').onclick = () => $('reportModal').classList.add('hidden');
$('reportReasons').addEventListener('click', async (e) => {
  const reason = e.target?.dataset?.reason;
  if (!reason || !S.peer) return;
  const result = await api('/api/report', { targetId: S.peer.userId, reason });
  $('reportModal').classList.add('hidden');
  toast(result.ok ? '신고를 접수했어요' : (result.error || '신고하지 못했어요'));
});
$('blockBtn').onclick = async () => {
  if (!S.peer) return;
  const result = await api('/api/block', { targetId: S.peer.userId });
  $('reportModal').classList.add('hidden');
  if (!result.ok) { toast(result.error || '차단하지 못했어요'); return; }
  toast('차단했어요. 다시 같은 테이블에 앉지 않아요.');
  doLeave();
};
$('rateModal').addEventListener('click', async (e) => {
  const score = e.target?.dataset?.score;
  if (e.target?.id === 'rateSkip') { $('rateModal').classList.add('hidden'); S.rated = true; doLeave(); return; }
  if (!score) return;
  if (S.rateTarget) await api('/api/rate', { targetId: S.rateTarget, score });
  S.rated = true;
  $('rateModal').classList.add('hidden');
  doLeave();
});
function enterLobby(user) {
  S.user = user;
  if (user?.nick) { $('nick').value = user.nick; localStorage.setItem('nick', user.nick); }
  $('regionPill').textContent = user?.region?.name ? `📍 ${user.region.name}` : '';
  $('mannerPill').textContent = user ? `매너 ${Number(user.manner).toFixed(1)}°C` : '';
  $('gate').classList.remove('active');
  if (!$('room').classList.contains('active')) $('entry').classList.add('active');
  occData = null;
  refreshOcc();
  requestAnimationFrame(editLoop);
}
initGate(enterLobby);
$('micBtn').onclick = () => {
  S.micOn = !S.micOn;
  micStream?.getAudioTracks().forEach((tr) => { tr.enabled = S.micOn; });
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
  scene.width = Math.max(1, Math.round(W * DPR));
  scene.height = Math.max(1, Math.round(H * DPR));
}
window.addEventListener('resize', resize);

function drawChair(ctx, ax, ay, size, venue) {
  const c = { cafe: '#8b5e3c', restaurant: '#5a1e28', bar: '#3a2c55' }[venue] || '#8b5e3c';
  const k = size / 400;
  ctx.save();
  ctx.translate(ax, ay);
  ctx.scale(k, k);
  ctx.fillStyle = c;
  ctx.beginPath();
  ctx.roundRect(-120, -30, 240, 200, 28);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  ctx.beginPath();
  ctx.roundRect(-102, -14, 204, 164, 22);
  ctx.fill();
  ctx.restore();
}

function placeAvatar() {
  const tableY = H * 0.70;
  const k = Math.min(W * 1.06 / 400, Math.max(0.52, (tableY - 76) / 372));
  return { tableY, size: k * 400, ax: W / 2, ay: tableY - 128 * k };
}

function partnerState(t) {
  const now = performance.now();
  const age = now - S.lastPartnerMotion;
  let tgt = S.partnerTarget;
  if (!S.lastPartnerMotion || age > 1100) {
    const idle = idleState(t);
    tgt = {
      ...S.partnerTarget,
      blinkL: idle.blinkL, blinkR: idle.blinkR,
      jaw: 0, pucker: 0, browUp: 0, browDown: 0,
      smile: idle.smile * 0.65, yaw: idle.yaw * 0.45, pitch: 0, roll: idle.roll, lookX: 0, lookY: 0,
    };
    if (!S.lastPartnerMotion || age > 2400) {
      for (const k of POSE_KEYS) tgt[k] = NEUTRAL[k];
      for (const k of HAND_L_KEYS) tgt[k] = NEUTRAL[k];
      for (const k of HAND_R_KEYS) tgt[k] = NEUTRAL[k];
    }
  }
  lerpState(S.partnerShown, tgt, !S.lastPartnerMotion || age > 1100 ? 0.08 : 0.36);
  return S.partnerShown;
}

function roomLoop(t) {
  if (!$('room').classList.contains('active')) return;
  S.frames++;
  try {
    sctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    drawBackground(sctx, W, H, S.venue, t);
    const { size, ax, ay } = placeAvatar();
    drawChair(sctx, ax, ay, size, S.venue);
    const partner = S.peer ? partnerState(t) : null;
    if (partner) drawAvatar(sctx, ax, ay, size, partner, S.peer.avatar, { time: t, pass: 'body' });
    drawTable(sctx, W, H, S.venue, S.table);
    if (partner) drawAvatar(sctx, ax, ay, size, partner, S.peer.avatar, { time: t, pass: 'limbs' });

    const faceLive = performance.now() - S.faceAt < 700;
    const shown = faceLive ? S.self : { ...S.self, ...idleFaceOnly(t, S.self) };
    lerpState(S.selfShown, shown, 0.45);
    paintBust(selfCtx, selfC.width, selfC.height, S.selfShown, S.look, t, true);
  } catch (e) {
    if (S.errors.length < 6) S.errors.push('draw: ' + (e && e.message || e));
  }
  requestAnimationFrame(roomLoop);
}

function idleFaceOnly(t, src) {
  const idle = idleState(t);
  return {
    blinkL: idle.blinkL, blinkR: idle.blinkR,
    jaw: 0, pucker: 0, browUp: 0, browDown: 0,
    smile: idle.smile, yaw: idle.yaw, pitch: 0, roll: idle.roll,
    lookX: idle.lookX, lookY: 0,
    // keep the tracked body
    lean: src.lean, shrugL: src.shrugL, shrugR: src.shrugR,
  };
}
