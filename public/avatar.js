// 2D chibi avatar renderer. State is in "subject" terms, drawn un-mirrored
// (as the partner sees you). Pass mirror=true for a selfie-style preview.
export const STYLES = {
  monk: '동자승', bob: '단발', long: '긴머리', cat: '고양이',
};
export const SKINS = ['#ffe0c7', '#f6cfa8', '#e9b48a', '#c98d63'];
export const OUTFITS = ['#8d8f99', '#e07a5f', '#3d85c6', '#6aa84f', '#b07cc6', '#f2b134'];

export const NEUTRAL = { blinkL: 0, blinkR: 0, jaw: 0, smile: 0, browUp: 0, browDown: 0, pucker: 0, yaw: 0, pitch: 0, roll: 0, lookX: 0, lookY: 0 };
export const KEYS = Object.keys(NEUTRAL);

export function encode(s) { return KEYS.map(k => Math.round(s[k] * 100) / 100); }
export function decode(a) { const o = {}; KEYS.forEach((k, i) => o[k] = +a[i] || 0); return o; }

export function lerpState(cur, tgt, t) {
  for (const k of KEYS) cur[k] += (tgt[k] - cur[k]) * t;
  return cur;
}

function ell(ctx, x, y, rx, ry, fill, rot = 0) {
  ctx.beginPath(); ctx.ellipse(x, y, Math.max(rx, 0.1), Math.max(ry, 0.1), rot, 0, Math.PI * 2);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
}
function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const c = (v) => Math.max(0, Math.min(255, v + amt));
  return `rgb(${c(n >> 16)},${c((n >> 8) & 255)},${c(n & 255)})`;
}

export function drawAvatar(ctx, cx, cy, size, s, look = {}, opts = {}) {
  const style = look.style || 'monk';
  const skin = look.skin || SKINS[0];
  const outfit = look.outfit || OUTFITS[0];
  const hair = '#2b2330';
  const t = (opts.time || 0) / 1000;
  const breathe = Math.sin(t * 2) * 2;
  const k = size / 260; // design space ~260 tall

  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(k, k);
  if (opts.mirror) ctx.scale(-1, 1);

  const yaw = Math.max(-1, Math.min(1, s.yaw));
  const pitch = Math.max(-1, Math.min(1, s.pitch));
  const roll = Math.max(-0.6, Math.min(0.6, s.roll));
  const fx = yaw * 38, fy = pitch * 26;

  // ---- body (robe) ----
  ctx.save();
  ctx.translate(yaw * 6, 120 + breathe);
  ctx.rotate(roll * 0.25);
  ctx.beginPath();
  ctx.moveTo(-78, 110); ctx.quadraticCurveTo(-85, 10, -40, -18);
  ctx.lineTo(40, -18); ctx.quadraticCurveTo(85, 10, 78, 110); ctx.closePath();
  ctx.fillStyle = outfit; ctx.fill();
  // collar
  ctx.beginPath(); ctx.moveTo(-34, -16); ctx.lineTo(0, 30); ctx.lineTo(34, -16);
  ctx.lineWidth = 9; ctx.strokeStyle = shade(outfit, -40); ctx.stroke();
  // hands resting on table
  ell(ctx, -46, 92, 18, 13, skin); ell(ctx, 46, 92, 18, 13, skin);
  ctx.restore();

  // ---- head ----
  ctx.save();
  ctx.translate(yaw * 10, pitch * 6 + breathe * 0.6);
  ctx.rotate(roll);

  // back hair (long)
  if (style === 'long') {
    ctx.beginPath();
    ctx.moveTo(-104 + fx * 0.2, -20); ctx.quadraticCurveTo(-118, 90, -80, 130);
    ctx.lineTo(80, 130); ctx.quadraticCurveTo(118, 90, 104 + fx * 0.2, -20); ctx.closePath();
    ctx.fillStyle = hair; ctx.fill();
  }
  // cat ears
  if (style === 'cat') {
    for (const side of [-1, 1]) {
      ctx.beginPath();
      const ex = side * 62 + fx * 0.3;
      ctx.moveTo(ex - 32, -60); ctx.lineTo(ex + side * 14, -128); ctx.lineTo(ex + 34, -60); ctx.closePath();
      ctx.fillStyle = outfit; ctx.fill();
      ctx.beginPath();
      ctx.moveTo(ex - 16, -66); ctx.lineTo(ex + side * 10, -108); ctx.lineTo(ex + 18, -66); ctx.closePath();
      ctx.fillStyle = '#ffb6c8'; ctx.fill();
    }
  }
  // ears (side ears shift opposite of yaw)
  for (const side of [-1, 1]) {
    const vis = 1 - Math.max(0, side * yaw) * 0.8;
    ell(ctx, side * (96 - Math.max(0, side * yaw) * 14) + fx * 0.15, 8 + fy * 0.3, 15 * vis, 20, shade(skin, -12));
  }
  // face
  ell(ctx, 0, 0, 100, 94, skin);
  // subtle shading toward turned-away side
  const g = ctx.createRadialGradient(fx * 0.8, fy * 0.5 - 20, 20, 0, 0, 105);
  g.addColorStop(0, 'rgba(255,255,255,0.18)'); g.addColorStop(1, 'rgba(120,60,40,0.10)');
  ell(ctx, 0, 0, 100, 94, g);

  // hair front
  if (style === 'monk') {
    ell(ctx, -30 + fx * 0.4, -62 + fy * 0.2, 26, 12, 'rgba(255,255,255,0.45)', -0.4);
    // faint shaved-head tone
    ctx.save(); ctx.beginPath(); ctx.ellipse(0, 0, 100, 94, 0, 0, Math.PI * 2); ctx.clip();
    ell(ctx, fx * 0.2, -96, 104, 56, 'rgba(90,110,140,0.13)'); ctx.restore();
  } else if (style === 'bob' || style === 'long') {
    ctx.save(); ctx.beginPath(); ctx.ellipse(0, 0, 104, 98, 0, 0, Math.PI * 2); ctx.clip();
    ctx.beginPath();
    ctx.moveTo(-110, 40); ctx.lineTo(-110, -110); ctx.lineTo(110, -110); ctx.lineTo(110, 40);
    ctx.quadraticCurveTo(92, -10, 84 + fx * 0.3, -30);
    // bangs
    const bx = fx * 0.5, by = fy * 0.3;
    ctx.quadraticCurveTo(50 + bx, -28 + by, 40 + bx, -44 + by);
    ctx.quadraticCurveTo(10 + bx, -30 + by, 0 + bx, -46 + by);
    ctx.quadraticCurveTo(-20 + bx, -28 + by, -44 + bx, -42 + by);
    ctx.quadraticCurveTo(-66 + bx, -26 + by, -84 + fx * 0.3, -30);
    ctx.quadraticCurveTo(-92, -10, -110, 40);
    ctx.closePath(); ctx.fillStyle = hair; ctx.fill();
    ctx.restore();
    if (style === 'bob') { ell(ctx, -98, 30, 14, 34, hair); ell(ctx, 98, 30, 14, 34, hair); }
    ell(ctx, -36 + fx * 0.4, -70, 22, 7, 'rgba(255,255,255,0.18)', -0.3);
  } else if (style === 'cat') {
    ctx.save(); ctx.beginPath(); ctx.ellipse(0, 0, 104, 98, 0, 0, Math.PI * 2); ctx.clip();
    ell(ctx, fx * 0.3, -92, 120, 50, outfit); ctx.restore();
  }

  // cheeks
  const blush = 0.25 + s.smile * 0.45;
  ell(ctx, -58 + fx, 30 + fy, 17, 10, `rgba(255,120,140,${blush})`);
  ell(ctx, 58 + fx, 30 + fy, 17, 10, `rgba(255,120,140,${blush})`);

  // eyes: screen-right eye = subject's LEFT eye (un-mirrored view)
  const eyes = [[-34, s.blinkR], [34, s.blinkL]];
  for (const [ex0, bl] of eyes) {
    const ex = ex0 + fx, ey = -2 + fy;
    const open = Math.max(0, Math.min(1, 1 - bl));
    const smileSquint = s.smile * 0.25;
    const h = 15 * Math.max(0, open - smileSquint);
    if (h < 3) {
      ctx.beginPath(); ctx.moveTo(ex - 12, ey); ctx.quadraticCurveTo(ex, ey - (s.smile > 0.3 ? 9 : -5), ex + 12, ey);
      ctx.lineWidth = 4.5; ctx.lineCap = 'round'; ctx.strokeStyle = '#2b2330'; ctx.stroke();
    } else {
      ell(ctx, ex, ey, 11.5, h, '#2b2330');
      const px = s.lookX * 3.5, py = -s.lookY * 3.5;
      ell(ctx, ex + 3.5 + px, ey - h * 0.4 + py, 4, Math.min(4, h * 0.35), '#fff');
      ell(ctx, ex - 3 + px, ey + h * 0.35 + py, 2, Math.min(2, h * 0.2), 'rgba(255,255,255,0.7)');
    }
  }

  // brows
  for (const side of [-1, 1]) {
    const bx = side * 36 + fx, by = -34 + fy - s.browUp * 11 + s.browDown * 6;
    const inner = s.browDown * 7 - s.browUp * 4; // positive -> inner end lower (angry)
    ctx.beginPath();
    ctx.moveTo(bx - side * 14, by + inner); // inner end
    ctx.quadraticCurveTo(bx, by - 4, bx + side * 14, by + 1);
    ctx.lineWidth = 5; ctx.lineCap = 'round';
    ctx.strokeStyle = style === 'monk' ? shade(skin, -90) : hair; ctx.stroke();
  }

  // nose
  ell(ctx, fx * 1.1, 16 + fy, 4, 3, shade(skin, -35));

  // mouth
  const mx = fx * 1.05, my = 40 + fy;
  const jaw = Math.max(0, Math.min(1, s.jaw));
  const pucker = Math.max(0, Math.min(1, s.pucker));
  if (jaw > 0.08) {
    const w = 14 + s.smile * 9 - pucker * 6, hh = 3 + jaw * 20;
    ctx.beginPath();
    ctx.moveTo(mx - w, my);
    ctx.quadraticCurveTo(mx, my - 3 + s.smile * 2, mx + w, my);
    ctx.quadraticCurveTo(mx + w * 0.9, my + hh * 1.6, mx, my + hh * 1.7);
    ctx.quadraticCurveTo(mx - w * 0.9, my + hh * 1.6, mx - w, my);
    ctx.fillStyle = '#8a2d3b'; ctx.fill();
    ctx.save(); ctx.clip();
    ell(ctx, mx, my + hh * 1.7, w * 0.7, hh * 0.7, '#ff7b8c'); ctx.restore();
  } else if (pucker > 0.35) {
    ell(ctx, mx, my + 2, 6, 7, '#8a2d3b');
  } else {
    const w = 12 + s.smile * 8;
    ctx.beginPath(); ctx.moveTo(mx - w, my); ctx.quadraticCurveTo(mx, my + 4 + s.smile * 12, mx + w, my);
    ctx.lineWidth = 4.5; ctx.lineCap = 'round'; ctx.strokeStyle = '#8a2d3b'; ctx.stroke();
  }
  ctx.restore(); // head
  ctx.restore();
}
