// Client-side landmark math. MediaPipe runs in the browser; this module only
// turns face / pose / hand results into the compact numeric state in avatar.js.
// Image space is the raw (unmirrored) front camera: +x right, +y down.
// Subject's left is +image x. Arm angles: 0 = straight down, positive = outward.

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const vis = (p, min = 0.35) => !!p && (p.visibility == null || p.visibility >= min);
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

function wrapPi(r) {
  while (r > Math.PI) r -= Math.PI * 2;
  while (r < -Math.PI) r += Math.PI * 2;
  return r;
}

/** Upper-arm / forearm angles. outSign +1 when image +x is outward (subject's left). */
export function limbAngles(sh, el, wr, outSign) {
  const ua = Math.atan2((el.x - sh.x) * outSign, el.y - sh.y);
  const fa = Math.atan2((wr.x - el.x) * outSign, wr.y - el.y);
  return {
    ua: clamp(ua, -Math.PI, Math.PI),
    fa: clamp(fa, -Math.PI, Math.PI),
  };
}

export function fingerCurl(lm, a, b, c, d) {
  const seg = dist(lm[a], lm[b]) + dist(lm[b], lm[c]) + dist(lm[c], lm[d]);
  if (seg < 1e-5) return 0;
  const span = dist(lm[a], lm[d]);
  // Natural joints never reach a perfect 0; remap so an open hand reads as open.
  return clamp((1 - span / seg - 0.06) / 0.72, 0, 1);
}

/**
 * @param {object} res FaceLandmarker result
 * @param {number} vw
 * @param {number} vh
 * @param {{n:number,pitch:number}} calib mutated across frames
 */
export function extractFace(res, vw, vh, calib) {
  const L = res.faceLandmarks[0];
  const bs = {};
  (res.faceBlendshapes?.[0]?.categories || []).forEach((c) => { bs[c.categoryName] = c.score; });
  const P = (i) => ({ x: L[i].x * vw, y: L[i].y * vh });
  const nose = P(1), le = P(234), re = P(454), top = P(10), chin = P(152), eR = P(33), eL = P(263);
  const half = Math.max(1, (re.x - le.x) / 2);
  const yaw = ((nose.x - (le.x + re.x) / 2) / half) * 1.2;
  const r = (nose.y - top.y) / Math.max(1, chin.y - top.y);
  if (calib.n < 20) { calib.pitch = (calib.pitch * calib.n + r) / (calib.n + 1); calib.n++; }
  const pitch = (r - calib.pitch) * 5;
  const roll = Math.atan2(eL.y - eR.y, eL.x - eR.x);
  const g = (k) => bs[k] || 0;
  const remap = (v, a, b) => clamp((v - a) / (b - a), 0, 1);
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
    yaw: clamp(yaw, -1, 1),
    pitch: clamp(pitch, -1, 1),
    roll,
    lookX: clamp(lookX * 2, -1, 1),
    lookY: clamp(lookY * 2, -1, 1),
  };
}

/** @param {Array<{x:number,y:number,visibility?:number}>|null} lm pose landmark 0 */
export function extractPose(lm) {
  if (!lm || !vis(lm[11]) || !vis(lm[12])) return null;
  const Ls = lm[11], Rs = lm[12];
  const sw = Math.max(0.04, dist(Ls, Rs));
  const lean = clamp(((Ls.y - Rs.y) / sw) * 1.5, -1, 1);
  const shrugOf = (ear, sh) => {
    if (!vis(ear, 0.25)) return 0;
    const d = dist(ear, sh) / sw;
    return clamp((0.42 - d) / 0.28, 0, 1);
  };
  const out = {
    pose: 1,
    lean,
    shrugL: shrugOf(lm[7], Ls),
    shrugR: shrugOf(lm[8], Rs),
  };
  if (vis(lm[13], 0.3) && vis(lm[15], 0.25)) {
    const a = limbAngles(Ls, lm[13], lm[15], 1);
    out.uaL = a.ua; out.faL = a.fa;
  }
  if (vis(lm[14], 0.3) && vis(lm[16], 0.25)) {
    const a = limbAngles(Rs, lm[14], lm[16], -1);
    out.uaR = a.ua; out.faR = a.fa;
  }
  if (out.uaL == null && out.uaR == null) return null;
  return out;
}

function packFingers(lm, outSign, fa) {
  const curls = [
    fingerCurl(lm, 1, 2, 3, 4),
    fingerCurl(lm, 5, 6, 7, 8),
    fingerCurl(lm, 9, 10, 11, 12),
    fingerCurl(lm, 13, 14, 15, 16),
    fingerCurl(lm, 17, 18, 19, 20),
  ];
  const scale = Math.max(0.02, dist(lm[0], lm[9]));
  const th = clamp(-(lm[4].y - lm[2].y) / scale, -1, 1);
  const handAng = Math.atan2((lm[9].x - lm[0].x) * outSign, lm[9].y - lm[0].y);
  const base = fa == null || Number.isNaN(fa) ? handAng : fa;
  const rot = clamp(wrapPi(handAng - base), -1.3, 1.3);
  const v1x = lm[5].x - lm[0].x, v1y = lm[5].y - lm[0].y;
  const v2x = lm[17].x - lm[0].x, v2y = lm[17].y - lm[0].y;
  const palm = (v1x * v2y - v1y * v2x) > 0 ? 1 : 0;
  return { curls, th, rot, palm };
}

/** Rough finger pose from pose-landmarker fingertips when the hand model has no hit. */
export function fingersFromPose(lm) {
  if (!lm) return {};
  const side = (wristI, elbowI, indexI, pinkyI, thumbI, prefix) => {
    const wrist = lm[wristI], index = lm[indexI], elbow = lm[elbowI], thumb = lm[thumbI], pinky = lm[pinkyI];
    if (!vis(wrist, 0.3) || !vis(index, 0.45) || !vis(elbow, 0.3)) return null;
    const forearm = Math.max(0.03, dist(elbow, wrist));
    const reach = dist(index, wrist) / forearm;
    const pinkyReach = vis(pinky, 0.4) ? dist(pinky, wrist) / forearm : reach;
    const open = clamp(((reach + pinkyReach) / 2 - 0.18) / 0.42, 0, 1);
    const curl = 1 - open;
    const th = vis(thumb, 0.4) ? clamp(-(thumb.y - wrist.y) / (forearm * 0.55), -1, 1) : 0;
    const o = {};
    o[`rot${prefix}`] = 0;
    o[`th${prefix}`] = th;
    o[`palm${prefix}`] = 0;
    o[`c${prefix}0`] = th > 0.45 ? 0.15 : curl;
    o[`c${prefix}1`] = curl;
    o[`c${prefix}2`] = curl;
    o[`c${prefix}3`] = curl;
    o[`c${prefix}4`] = Math.min(1, curl + 0.05);
    return o;
  };
  const L = side(15, 13, 19, 17, 21, 'L');
  const R = side(16, 14, 20, 18, 22, 'R');
  const out = {};
  if (L) Object.assign(out, L);
  if (R) Object.assign(out, R);
  return out;
}

function nearestHand(items, target) {
  let best = null, bestD = 0.2;
  for (const h of items) {
    if (h.used) continue;
    const d = dist(h.lm[0], target);
    if (d < bestD) { bestD = d; best = h; }
  }
  if (best) best.used = true;
  return best;
}

/**
 * @param {{landmarks?:object[][], handedness?:object[][]}|null} handRes
 * @param {object[]|null} poseLm
 */
export function extractHands(handRes, poseLm) {
  const items = (handRes?.landmarks || []).map((lm, i) => ({
    lm,
    label: handRes.handedness?.[i]?.[0]?.categoryName || '',
    used: false,
  }));
  const out = {};
  const apply = (item, prefix, outSign, fa) => {
    if (!item) return;
    const pack = packFingers(item.lm, outSign, fa);
    out[`hand${prefix}`] = 1;
    out[`rot${prefix}`] = pack.rot;
    out[`th${prefix}`] = pack.th;
    out[`palm${prefix}`] = pack.palm;
    pack.curls.forEach((c, i) => { out[`c${prefix}${i}`] = c; });
  };
  // Prefer pose wrists (anatomical). Handedness labels assume a mirrored selfie and
  // are easy to get backwards, so image x is only a fallback: +x is the subject's left.
  if (items.length && poseLm && vis(poseLm[15], 0.2) && vis(poseLm[16], 0.2)) {
    apply(nearestHand(items, poseLm[15]), 'L', 1, null);
    apply(nearestHand(items, poseLm[16]), 'R', -1, null);
  } else {
    for (const h of items) {
      const isLeft = h.lm[0].x >= 0.5;
      if (isLeft && out.handL) continue;
      if (!isLeft && out.handR) continue;
      apply(h, isLeft ? 'L' : 'R', isLeft ? 1 : -1, 0);
    }
  }
  if (poseLm) {
    const refine = (prefix, shI, elI, wrI, outSign) => {
      if (!out[`hand${prefix}`] || !vis(poseLm[elI], 0.2) || !vis(poseLm[wrI], 0.2)) return;
      const { fa } = limbAngles(poseLm[shI], poseLm[elI], poseLm[wrI], outSign);
      const target = poseLm[wrI];
      let best = null, bestD = 0.2;
      for (const h of items) {
        const d = dist(h.lm[0], target);
        if (d < bestD) { bestD = d; best = h; }
      }
      if (!best) return;
      out[`rot${prefix}`] = packFingers(best.lm, outSign, fa).rot;
    };
    refine('L', 11, 13, 15, 1);
    refine('R', 12, 14, 16, -1);
  }
  return out;
}
