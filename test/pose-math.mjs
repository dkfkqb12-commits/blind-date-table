import {
  limbAngles, fingerCurl, extractPose, extractHands, fingersFromPose,
} from '../public/tracking.js';
import { encode, decode, NEUTRAL, normalizeLook, KEYS } from '../public/avatar.js';

let failed = 0;
function assert(cond, msg) {
  if (!cond) { failed++; console.error('FAIL', msg); }
  else console.log('ok', msg);
}
const near = (a, b, eps = 0.2) => Math.abs(a - b) < eps;

// Straight down → angle ~ 0. Image +x is outward for the subject's left arm.
{
  const a = limbAngles({ x: 0.6, y: 0.4 }, { x: 0.6, y: 0.55 }, { x: 0.6, y: 0.7 }, 1);
  assert(near(a.ua, 0, 0.15) && near(a.fa, 0, 0.15), `arm down ua=${a.ua.toFixed(2)} fa=${a.fa.toFixed(2)}`);
}
// Out to the side → about π/2.
{
  const a = limbAngles({ x: 0.6, y: 0.4 }, { x: 0.78, y: 0.4 }, { x: 0.92, y: 0.42 }, 1);
  assert(near(a.ua, Math.PI / 2, 0.25), `arm out ua=${a.ua.toFixed(2)}`);
}
// Raised overhead → about π.
{
  const a = limbAngles({ x: 0.6, y: 0.4 }, { x: 0.6, y: 0.28 }, { x: 0.58, y: 0.16 }, 1);
  assert(near(Math.abs(a.ua), Math.PI, 0.35), `arm up ua=${a.ua.toFixed(2)}`);
}

function poseLm(over = {}) {
  const lm = Array.from({ length: 25 }, (_, i) => ({ x: 0.5, y: 0.5, visibility: 1, i }));
  // person's right shoulder (image left), person's left shoulder (image right)
  lm[12] = { x: 0.38, y: 0.42, visibility: 1 };
  lm[11] = { x: 0.62, y: 0.42, visibility: 1 };
  lm[8] = { x: 0.40, y: 0.22, visibility: 1 };
  lm[7] = { x: 0.60, y: 0.22, visibility: 1 };
  lm[14] = { x: 0.30, y: 0.58, visibility: 1 };
  lm[13] = { x: 0.70, y: 0.58, visibility: 1 };
  lm[16] = { x: 0.40, y: 0.70, visibility: 1 };
  lm[15] = { x: 0.60, y: 0.70, visibility: 1 };
  Object.entries(over).forEach(([i, p]) => { lm[i] = { visibility: 1, ...p }; });
  return lm;
}

{
  const p = extractPose(poseLm());
  assert(p && p.pose === 1, 'pose detected');
  assert(p && near(p.shrugL, 0, 0.05) && near(p.shrugR, 0, 0.05), `rest shrug L=${p?.shrugL} R=${p?.shrugR}`);
  assert(p && p.uaL > 0.2 && p.uaR > 0.2, `resting elbows out uaL=${p?.uaL?.toFixed(2)} uaR=${p?.uaR?.toFixed(2)}`);
}
{
  const p = extractPose(poseLm({
    7: { x: 0.60, y: 0.38 },
    11: { x: 0.62, y: 0.42 },
  }));
  assert(p && p.shrugL > 0.4, `shrug when ear drops toward shoulder (${p?.shrugL})`);
}
{
  assert(extractPose(null) === null, 'missing pose is null');
  const hidden = poseLm();
  hidden[11].visibility = 0;
  assert(extractPose(hidden) === null, 'invisible shoulder rejects pose');
}

function bentHand(curl, { thumbUp = false } = {}) {
  const lm = Array.from({ length: 21 }, () => ({ x: 0.6, y: 0.7 }));
  const w = { x: 0.6, y: 0.7 };
  lm[0] = { ...w };
  const chains = [
    { ids: [1, 2, 3, 4], ang: thumbUp ? -0.1 : 0.9, len: 0.07, c: thumbUp ? 0.05 : curl },
    { ids: [5, 6, 7, 8], ang: -0.2, len: 0.1, c: curl },
    { ids: [9, 10, 11, 12], ang: 0, len: 0.11, c: curl },
    { ids: [13, 14, 15, 16], ang: 0.18, len: 0.1, c: curl },
    { ids: [17, 18, 19, 20], ang: 0.36, len: 0.08, c: curl },
  ];
  for (const ch of chains) {
    let x = w.x, y = w.y, ang = ch.ang;
    const seg = ch.len / ch.ids.length;
    ch.ids.forEach((id) => {
      ang += ch.c * 1.45;
      x += Math.sin(ang) * seg;
      y -= Math.cos(ang) * seg;
      lm[id] = { x, y };
    });
  }
  return lm;
}

{
  const open = bentHand(0);
  const fist = bentHand(1);
  assert(fingerCurl(open, 5, 6, 7, 8) < 0.2, `open index curl ${fingerCurl(open, 5, 6, 7, 8).toFixed(2)}`);
  assert(fingerCurl(fist, 5, 6, 7, 8) > 0.55, `fist index curl ${fingerCurl(fist, 5, 6, 7, 8).toFixed(2)}`);
  const up = bentHand(1, { thumbUp: true });
  const pose = poseLm();
  pose[15] = { x: 0.6, y: 0.7, visibility: 1 };
  const hands = extractHands({ landmarks: [up], handedness: [[{ categoryName: 'Left', score: 0.9 }]] }, pose);
  assert(hands.handL === 1, 'hand assigned to subject left via pose wrist');
  assert(hands.thL > 0.45, `thumbs-up thL=${hands.thL}`);
  assert(hands.cL0 < 0.45 && hands.cL2 > 0.45, `thumb open, other fingers curled cL0=${hands.cL0?.toFixed(2)} cL2=${hands.cL2?.toFixed(2)}`);
}

{
  // Point: index straight, others curled.
  const lm = bentHand(1);
  const straight = bentHand(0);
  [5, 6, 7, 8].forEach((i) => { lm[i] = straight[i]; });
  assert(fingerCurl(lm, 5, 6, 7, 8) < 0.25, 'point index is open');
  assert(fingerCurl(lm, 9, 10, 11, 12) > 0.5, 'point middle stays curled');
}

{
  const lm = poseLm();
  lm[13] = { x: 0.70, y: 0.55, visibility: 1 };
  lm[15] = { x: 0.60, y: 0.70, visibility: 1 };
  lm[19] = { x: 0.61, y: 0.69, visibility: 1 };
  lm[17] = { x: 0.63, y: 0.70, visibility: 1 };
  lm[21] = { x: 0.57, y: 0.66, visibility: 1 };
  const closed = fingersFromPose(lm);
  assert(closed.cL1 > 0.55, `pose-fallback closed finger cL1=${closed.cL1}`);
  lm[19] = { x: 0.64, y: 0.50, visibility: 1 };
  lm[17] = { x: 0.74, y: 0.52, visibility: 1 };
  const opened = fingersFromPose(lm);
  assert(opened.cL1 < 0.35 && opened.cL1 < closed.cL1, `open fingertip curls less (${opened.cL1?.toFixed(2)} < ${closed.cL1?.toFixed(2)})`);
}

{
  const legacy = normalizeLook({ style: 'monk', skin: '#ffe0c7', outfit: '#e07a5f' });
  assert(legacy.hair === 'short' && legacy.outfit === 'tee' && legacy.outfitColor === '#e07a5f', 'legacy monk look migrates');
  const kept = normalizeLook({ hair: 'pony', outfit: 'leather', glasses: 'round', hat: 'beret', earrings: 'hoop' });
  assert(kept.hair === 'pony' && kept.outfit === 'leather' && kept.glasses === 'round' && kept.hat === 'beret', 'new look kept');
  const bad = normalizeLook({ hair: '<script>', outfitColor: 'red' });
  assert(bad.hair === 'wavy' && bad.outfitColor !== 'red', 'rejects unsafe look fields');
}

{
  const s = { ...NEUTRAL, uaL: 2.2, faL: -0.4, cL1: 0.8, smile: 0.4 };
  const back = decode(encode(s));
  assert(near(back.uaL, 2.2, 0.02) && near(back.cL1, 0.8, 0.02) && near(back.smile, 0.4, 0.02), 'encode/decode roundtrip');
  const old = decode([0.1, 0.2, 0.3]);
  assert(old.uaL === NEUTRAL.uaL && old.blinkL === 0.1, 'short legacy packet keeps rest arms');
  assert(KEYS.length > 30, `state has ${KEYS.length} channels`);
}

if (failed) {
  console.error(`${failed} failed`);
  process.exit(1);
}
console.log('pose-math passed');
