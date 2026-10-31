// Upper-body webtoon avatar. Design space is ~400 wide.
// Origin = shoulder center. +x = subject's left (screen-right for the partner).
// +y = down. Pass mirror:true for a selfie preview.
// pass: 'body' (behind the table) | 'limbs' (arms and hands, in front) | 'all'

export const HAIRS = {
  short: '짧은 머리',
  twoblock: '투블럭',
  slick: '올백',
  perm: '곱슬펌',
  bob: '단발',
  long: '생머리',
  wavy: '웨이브',
  pony: '포니테일',
  bun: '묶음머리',
};
export const HAIR_COLORS = ['#1b1918', '#3a2a24', '#6b4226', '#a56b3c', '#d7b07a', '#c9b8a2', '#d4728a', '#7a3e62', '#c5c6ce', '#efe8dc'];
export const SKINS = ['#fde4d4', '#f3c8a8', '#e0aa84', '#c68655', '#8d5524', '#5c3310'];
export const EYES = { round: '동글', almond: '아몬드', sharp: '날카로운', soft: '부드러운' };
export const EYE_COLORS = ['#3a2a22', '#7a4b2a', '#8a7a3a', '#5d6e78', '#3d6ea8', '#2f6b4f'];
export const BROWS = { soft: '소프트', straight: '일자', arched: '아치', thick: '진한' };
export const OUTFITS = {
  tee: '티셔츠',
  hoodie: '후드',
  shirt: '셔츠',
  blazer: '수트',
  knit: '니트',
  dress: '원피스',
  cardigan: '가디건',
  leather: '가죽재킷',
};
export const OUTFIT_COLORS = ['#f4f1ec', '#2c3038', '#1b1c1f', '#c23b4a', '#2f5f93', '#efe0c8', '#6b4c7a', '#e7b7c6', '#3d6b58', '#c4a574'];
export const GLASSES = { none: '없음', round: '둥근', square: '사각', thin: '얇은테' };
export const EARRINGS = { none: '없음', stud: '스터드', hoop: '링', drop: '드롭' };
export const HATS = { none: '없음', cap: '캡', beret: '베레모', beanie: '비니' };

export const DEFAULT_LOOK = {
  hair: 'wavy',
  hairColor: '#3a2a24',
  skin: '#f3c8a8',
  eye: 'almond',
  eyeColor: '#5c3b2e',
  brow: 'soft',
  outfit: 'knit',
  outfitColor: '#2f5f93',
  glasses: 'none',
  earrings: 'none',
  hat: 'none',
};

const STYLE_MAP = { bob: 'bob', long: 'long', monk: 'short', cat: 'wavy' };

export const NEUTRAL = {
  blinkL: 0, blinkR: 0, jaw: 0, smile: 0.12, browUp: 0, browDown: 0, pucker: 0,
  yaw: 0, pitch: 0, roll: 0, lookX: 0, lookY: 0,
  lean: 0, shrugL: 0, shrugR: 0, pose: 0,
  uaL: 0.42, faL: -0.92, uaR: 0.38, faR: -1.02,
  handL: 0, handR: 0, rotL: 0, rotR: 0, thL: 0.05, thR: 0.05, palmL: 0, palmR: 0,
  cL0: 0.28, cL1: 0.22, cL2: 0.2, cL3: 0.24, cL4: 0.32,
  cR0: 0.28, cR1: 0.22, cR2: 0.2, cR3: 0.24, cR4: 0.34,
};

export const KEYS = Object.keys(NEUTRAL);
export const POSE_KEYS = ['lean', 'shrugL', 'shrugR', 'pose', 'uaL', 'faL', 'uaR', 'faR'];
export const HAND_L_KEYS = ['handL', 'rotL', 'thL', 'palmL', 'cL0', 'cL1', 'cL2', 'cL3', 'cL4'];
export const HAND_R_KEYS = ['handR', 'rotR', 'thR', 'palmR', 'cR0', 'cR1', 'cR2', 'cR3', 'cR4'];
const ANGLE_KEYS = new Set(['uaL', 'faL', 'uaR', 'faR', 'rotL', 'rotR', 'roll']);

const UPPER = 86;
const FORE = 78;

const clamp = (v, a, b) => Math.max(a, Math.min(b, v || 0));
const isHex = (v) => typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v);

export function normalizeLook(look = {}) {
  const o = { ...DEFAULT_LOOK };
  const src = look && typeof look === 'object' ? look : {};
  if (HAIRS[src.hair]) o.hair = src.hair;
  else if (STYLE_MAP[src.style]) o.hair = STYLE_MAP[src.style];
  if (isHex(src.hairColor)) o.hairColor = src.hairColor;
  if (isHex(src.skin)) o.skin = src.skin;
  if (EYES[src.eye]) o.eye = src.eye;
  if (isHex(src.eyeColor)) o.eyeColor = src.eyeColor;
  if (BROWS[src.brow]) o.brow = src.brow;
  if (OUTFITS[src.outfit]) o.outfit = src.outfit;
  else if (isHex(src.outfit)) { o.outfit = 'tee'; o.outfitColor = src.outfit; }
  if (isHex(src.outfitColor)) o.outfitColor = src.outfitColor;
  if (GLASSES[src.glasses]) o.glasses = src.glasses;
  if (EARRINGS[src.earrings]) o.earrings = src.earrings;
  if (HATS[src.hat]) o.hat = src.hat;
  return o;
}

export function encode(s) {
  return KEYS.map((k) => Math.round((Number(s[k]) || 0) * 100) / 100);
}
export function decode(a) {
  const o = { ...NEUTRAL };
  if (!Array.isArray(a)) return o;
  for (let i = 0; i < KEYS.length && i < a.length; i++) {
    const n = Number(a[i]);
    if (Number.isFinite(n)) o[KEYS[i]] = n;
  }
  return o;
}
function lerpAngle(a, b, t) {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}
export function lerpState(cur, tgt, t) {
  for (const k of KEYS) {
    const dest = tgt[k] == null || Number.isNaN(+tgt[k]) ? NEUTRAL[k] : +tgt[k];
    cur[k] = ANGLE_KEYS.has(k) ? lerpAngle(cur[k] || 0, dest, t) : cur[k] + (dest - cur[k]) * t;
  }
  return cur;
}

function hexRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function shade(hex, amt) {
  const [r, g, b] = hexRgb(hex);
  const c = (v) => Math.max(0, Math.min(255, Math.round(v + amt)));
  return `rgb(${c(r)},${c(g)},${c(b)})`;
}
function mixHex(a, b, t) {
  const A = hexRgb(a), B = hexRgb(b);
  const c = (i) => Math.round(A[i] + (B[i] - A[i]) * t);
  return `rgb(${c(0)},${c(1)},${c(2)})`;
}
function luma(hex) {
  const [r, g, b] = hexRgb(hex);
  return (r * 299 + g * 587 + b * 114) / 1000;
}
function ink(hex, amt = 28) {
  return luma(hex) > 150 ? shade(hex, -amt) : shade(hex, amt);
}

function ell(ctx, x, y, rx, ry, fill, rot = 0) {
  ctx.beginPath();
  ctx.ellipse(x, y, Math.max(rx, 0.1), Math.max(ry, 0.1), rot, 0, Math.PI * 2);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
}
function pathFill(ctx, fn, fill, stroke, sw = 1.4) {
  ctx.beginPath();
  fn();
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = sw;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.stroke();
  }
}

function layoutOf(s, time) {
  const breathe = Math.sin((time || 0) / 1000 * 1.7) * 2.2;
  const lean = clamp(s.lean, -1, 1);
  const yaw = clamp(s.yaw, -1, 1);
  const pitch = clamp(s.pitch, -1, 1);
  const roll = clamp(s.roll, -0.5, 0.5);
  const shL = { x: 96 + lean * 4, y: -2 + lean * 12 - clamp(s.shrugL, 0, 1) * 16 + breathe * 0.25 };
  const shR = { x: -96 - lean * 4, y: -2 - lean * 12 - clamp(s.shrugR, 0, 1) * 16 + breathe * 0.25 };
  const head = {
    x: lean * 6 + yaw * 8,
    y: -128 + pitch * 6 + breathe * 0.3,
    yaw, pitch, roll,
  };
  return { breathe, lean, yaw, pitch, roll, shL, shR, head };
}

function chain(sh, ua, fa, sign) {
  const u = clamp(ua, -Math.PI, Math.PI);
  const f = clamp(fa, -Math.PI, Math.PI);
  const elbow = { x: sh.x + Math.sin(u) * sign * UPPER, y: sh.y + Math.cos(u) * UPPER };
  const wrist = { x: elbow.x + Math.sin(f) * sign * FORE, y: elbow.y + Math.cos(f) * FORE };
  const hdx = Math.sin(f) * sign;
  const hdy = Math.cos(f);
  return { elbow, wrist, hdx, hdy, sign };
}

export function drawAvatar(ctx, cx, cy, size, state, look, opts = {}) {
  const pass = opts.pass || 'all';
  const L = normalizeLook(look);
  const s = state || NEUTRAL;
  const k = size / 400;
  const lay = layoutOf(s, opts.time || 0);
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(k, k);
  if (opts.mirror) ctx.scale(-1, 1);
  if (pass === 'all' || pass === 'body') drawBody(ctx, s, L, lay);
  if (pass === 'all' || pass === 'limbs') drawLimbs(ctx, s, L, lay);
  ctx.restore();
}

function drawBody(ctx, s, look, lay) {
  const { head } = lay;
  if (look.outfit === 'hoodie') drawHood(ctx, look.outfitColor, head);
  drawHairBack(ctx, look, head);
  drawNeck(ctx, look.skin, head);
  drawTorso(ctx, look, lay);
  ctx.save();
  ctx.translate(head.x, head.y);
  ctx.rotate(head.roll);
  drawHead(ctx, s, look, head);
  ctx.restore();
}

function drawNeck(ctx, skin, head) {
  const top = head.y + 58;
  const g = ctx.createLinearGradient(-28, top, 28, -8);
  g.addColorStop(0, shade(skin, -24));
  g.addColorStop(0.45, skin);
  g.addColorStop(1, shade(skin, -16));
  ctx.save();
  ctx.translate(head.x * 0.35, 0);
  pathFill(ctx, () => {
    ctx.moveTo(-16, top);
    ctx.quadraticCurveTo(-26, (top - 16) / 2, -24, -12);
    ctx.lineTo(24, -12);
    ctx.quadraticCurveTo(26, (top - 16) / 2, 16, top);
    ctx.quadraticCurveTo(0, top + 10, -16, top);
  }, g);
  ctx.restore();
}

function drawHood(ctx, color, head) {
  ctx.save();
  ctx.translate(head.x, head.y + 48);
  pathFill(ctx, () => {
    ctx.moveTo(-46, 30);
    ctx.quadraticCurveTo(-54, -8, 0, -28);
    ctx.quadraticCurveTo(54, -8, 46, 30);
    ctx.quadraticCurveTo(0, 12, -46, 30);
  }, shade(color, -16));
  ctx.restore();
}

function drawTorso(ctx, look, lay) {
  const { shL, shR } = lay;
  const color = look.outfitColor;
  const kind = look.outfit;
  const hem = kind === 'dress' ? 176 : 156;
  const waistL = kind === 'dress' ? 52 : 66;
  const waistR = kind === 'dress' ? -52 : -66;
  const neckDrop = kind === 'dress' ? -16 : -40;
  const g = ctx.createLinearGradient(-40, -40, 70, hem);
  g.addColorStop(0, shade(color, luma(color) > 160 ? 8 : 22));
  g.addColorStop(0.45, color);
  g.addColorStop(1, shade(color, -32));

  const torso = () => {
    ctx.moveTo(18, neckDrop);
    ctx.lineTo(shL.x + 8, shL.y + 2);
    ctx.quadraticCurveTo(shL.x + 20, shL.y + 26, shL.x - 2, shL.y + 40);
    ctx.quadraticCurveTo(waistL + 10, 86, waistL + (kind === 'dress' ? 22 : 8), hem);
    ctx.lineTo(waistR - (kind === 'dress' ? 22 : 8), hem);
    ctx.quadraticCurveTo(waistR - 10, 86, shR.x + 2, shR.y + 40);
    ctx.quadraticCurveTo(shR.x - 20, shR.y + 26, shR.x - 8, shR.y + 2);
    ctx.lineTo(-18, neckDrop);
    ctx.quadraticCurveTo(0, neckDrop + 12, 18, neckDrop);
  };
  pathFill(ctx, torso, g, shade(color, -40), 1.25);

  if (kind === 'tee') {
    pathFill(ctx, () => {
      ctx.moveTo(-16, -28);
      ctx.quadraticCurveTo(0, -6, 16, -28);
      ctx.quadraticCurveTo(0, -18, -16, -28);
    }, shade(look.skin, -8));
  } else if (kind === 'shirt') {
    drawCollar(ctx, color, false);
    ctx.strokeStyle = ink(color, 40);
    ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(0, -18); ctx.lineTo(0, 78); ctx.stroke();
    for (const y of [-2, 18, 38, 58]) ell(ctx, 0, y, 2.3, 2.3, ink(color, 20));
  } else if (kind === 'blazer') {
    // shirt underneath
    pathFill(ctx, () => {
      ctx.moveTo(-14, -24); ctx.lineTo(0, 36); ctx.lineTo(14, -24); ctx.closePath();
    }, '#f7f4ef');
    ctx.strokeStyle = shade(color, luma(color) > 80 ? -45 : 30);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-16, -26); ctx.lineTo(-34, 28); ctx.lineTo(-10, 8); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(16, -26); ctx.lineTo(34, 28); ctx.lineTo(10, 8); ctx.stroke();
    ctx.fillStyle = ink(color, 18);
    ctx.globalAlpha = 0.35;
    ctx.fillRect(-22, 48, 16, 3);
    ctx.globalAlpha = 1;
  } else if (kind === 'hoodie') {
    ctx.strokeStyle = shade(color, -25);
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-8, -18); ctx.quadraticCurveTo(-6, 8, -4, 22);
    ctx.moveTo(8, -18); ctx.quadraticCurveTo(6, 10, 5, 26);
    ctx.stroke();
    pathFill(ctx, () => {
      ctx.moveTo(-34, 48);
      ctx.quadraticCurveTo(0, 28, 34, 48);
      ctx.quadraticCurveTo(0, 92, -34, 48);
    }, shade(color, -14), shade(color, -35), 1.2);
    ctx.fillStyle = shade(color, -30);
    ctx.fillRect(-70, hem - 16, 140, 14);
  } else if (kind === 'knit') {
    ctx.save();
    ctx.beginPath(); torso(); ctx.clip();
    ctx.strokeStyle = 'rgba(255,255,255,0.16)';
    ctx.lineWidth = 2;
    for (let y = -10; y < hem; y += 9) {
      ctx.beginPath(); ctx.moveTo(-80, y); ctx.lineTo(80, y); ctx.stroke();
    }
    ctx.restore();
    ctx.fillStyle = shade(color, -22);
    ctx.fillRect(-48, -30, 96, 10);
    ctx.fillRect(-72, hem - 14, 144, 12);
  } else if (kind === 'dress') {
    pathFill(ctx, () => {
      ctx.moveTo(-22, -6);
      ctx.quadraticCurveTo(0, 18, 22, -6);
      ctx.quadraticCurveTo(0, 4, -22, -6);
    }, shade(look.skin, -6));
    ctx.strokeStyle = 'rgba(255,255,255,0.28)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-20, 70); ctx.quadraticCurveTo(0, 62, 20, 70); ctx.stroke();
  } else if (kind === 'cardigan') {
    pathFill(ctx, () => {
      ctx.moveTo(-12, -22); ctx.lineTo(-8, hem - 8); ctx.lineTo(8, hem - 8); ctx.lineTo(12, -22); ctx.closePath();
    }, '#f6f1ea');
    ctx.strokeStyle = shade(color, -30);
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(-14, -16); ctx.lineTo(-10, hem - 10); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(14, -16); ctx.lineTo(10, hem - 10); ctx.stroke();
    for (const y of [0, 22, 44, 66]) ell(ctx, -12, y, 2.2, 2.2, shade(color, -20));
    ctx.fillStyle = shade(color, -24);
    ctx.fillRect(-74, hem - 14, 148, 12);
  } else if (kind === 'leather') {
    const sheen = ctx.createLinearGradient(-60, -40, 40, 40);
    sheen.addColorStop(0, 'rgba(255,255,255,0.22)');
    sheen.addColorStop(0.4, 'rgba(255,255,255,0)');
    sheen.addColorStop(1, 'rgba(0,0,0,0.15)');
    pathFill(ctx, torso, sheen);
    drawCollar(ctx, color, true);
    ctx.strokeStyle = 'rgba(230,230,235,0.8)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(6, -16); ctx.lineTo(-2, 70); ctx.stroke();
    pathFill(ctx, () => {
      ctx.moveTo(-38, 18); ctx.lineTo(-14, 18); ctx.lineTo(-14, 36); ctx.lineTo(-38, 36); ctx.closePath();
    }, shade(color, 12), 'rgba(255,255,255,0.25)', 1);
  }
}

function drawCollar(ctx, color, leather) {
  const c = leather ? shade(color, 16) : '#f7f5f2';
  const edge = leather ? 'rgba(255,255,255,0.35)' : shade('#d9d3cc', -10);
  pathFill(ctx, () => {
    ctx.moveTo(-6, -34);
    ctx.lineTo(-28, -6);
    ctx.lineTo(-10, -16);
    ctx.closePath();
  }, c, edge, 1);
  pathFill(ctx, () => {
    ctx.moveTo(6, -34);
    ctx.lineTo(28, -6);
    ctx.lineTo(10, -16);
    ctx.closePath();
  }, c, edge, 1);
}

// ---------- hair ----------
function hairGrad(ctx, color, y0, y1) {
  const g = ctx.createLinearGradient(0, y0, 20, y1);
  g.addColorStop(0, shade(color, 36));
  g.addColorStop(0.35, color);
  g.addColorStop(1, shade(color, -32));
  return g;
}

function drawHairBack(ctx, look, head) {
  const style = look.hair;
  const color = look.hairColor;
  ctx.save();
  ctx.translate(head.x, head.y);
  ctx.rotate(head.roll * 0.5);
  if (style === 'long' || style === 'wavy') {
    const g = hairGrad(ctx, color, -20, 250);
    pathFill(ctx, () => {
      ctx.moveTo(-58, -10);
      if (style === 'wavy') {
        ctx.bezierCurveTo(-96, 24, -36, 80, -104, 130);
        ctx.bezierCurveTo(-70, 180, -112, 210, -84, 255);
        ctx.lineTo(84, 255);
        ctx.bezierCurveTo(112, 210, 70, 180, 104, 130);
        ctx.bezierCurveTo(36, 80, 96, 24, 58, -10);
      } else {
        ctx.quadraticCurveTo(-98, 50, -80, 150);
        ctx.quadraticCurveTo(-74, 220, -66, 258);
        ctx.lineTo(66, 258);
        ctx.quadraticCurveTo(74, 220, 80, 150);
        ctx.quadraticCurveTo(98, 50, 58, -10);
      }
      ctx.closePath();
    }, g);
  } else if (style === 'pony') {
    pathFill(ctx, () => {
      ctx.moveTo(16, -58);
      ctx.quadraticCurveTo(40, -10, 48, 50);
      ctx.quadraticCurveTo(54, 120, 32, 175);
      ctx.quadraticCurveTo(20, 110, 22, 46);
      ctx.quadraticCurveTo(18, -8, 6, -40);
      ctx.closePath();
    }, hairGrad(ctx, color, -60, 175));
    ell(ctx, 14, -56, 8, 5, shade(color, -28));
  }
  ctx.restore();
}

// Brow line stays above the eyes (eye centers are near y = -6).
function skullCap(ctx, fill, stroke, o = {}) {
  const top = o.top ?? -88;
  const side = o.side ?? 70;
  const brow = o.brow ?? -22;
  const low = o.low ?? 10;
  pathFill(ctx, () => {
    ctx.moveTo(-side, low);
    ctx.bezierCurveTo(-side - 4, -8, -side - 2, -52, -18, top);
    ctx.quadraticCurveTo(12, top - 14, side * 0.72, top + 4);
    ctx.bezierCurveTo(side + 4, -48, side + 6, -6, side, low);
    ctx.quadraticCurveTo(side * 0.42, brow, 6, brow);
    ctx.quadraticCurveTo(-side * 0.15, brow - 6, -side, low);
  }, fill, stroke, 1.15);
}

function bangs(ctx, color) {
  pathFill(ctx, () => {
    ctx.moveTo(-40, -36);
    ctx.quadraticCurveTo(-18, -18, -4, -30);
    ctx.quadraticCurveTo(14, -16, 34, -28);
    ctx.quadraticCurveTo(8, -40, -40, -36);
  }, color);
}

function sideLock(ctx, color, x, len, wavy) {
  const dir = x > 0 ? 1 : -1;
  pathFill(ctx, () => {
    ctx.moveTo(x, -18);
    if (wavy) {
      ctx.bezierCurveTo(x + dir * 28, 18, x - dir * 24, 72, x + dir * 20, len);
      ctx.lineTo(x + dir * 20 - dir * 18, len - 8);
      ctx.bezierCurveTo(x - dir * 28, 64, x + dir * 10, 22, x - dir * 10, -10);
    } else {
      ctx.quadraticCurveTo(x + dir * 8, len * 0.45, x + dir * 2, len);
      ctx.lineTo(x - dir * 14, len - 4);
      ctx.quadraticCurveTo(x - dir * 2, len * 0.4, x - dir * 8, -10);
    }
    ctx.closePath();
  }, color);
}

function drawHairFront(ctx, look) {
  const style = look.hair;
  const color = look.hairColor;
  const covered = look.hat === 'beanie' || look.hat === 'cap';
  const g = hairGrad(ctx, color, -100, 20);
  const edge = shade(color, -32);

  if (style === 'short') {
    skullCap(ctx, g, edge, { top: -82, side: 58, brow: -28, low: -4 });
    pathFill(ctx, () => {
      ctx.moveTo(-30, -68);
      ctx.quadraticCurveTo(-6, -98, 22, -70);
      ctx.quadraticCurveTo(4, -76, -30, -68);
    }, shade(color, 20));
  } else if (style === 'twoblock') {
    skullCap(ctx, g, edge, { top: -98, side: 66, brow: -30, low: 8 });
    pathFill(ctx, () => {
      ctx.moveTo(-64, 10);
      ctx.quadraticCurveTo(-72, -18, -50, -6);
      ctx.quadraticCurveTo(-58, 16, -64, 10);
    }, shade(color, -20));
    pathFill(ctx, () => {
      ctx.moveTo(62, 8);
      ctx.quadraticCurveTo(72, -20, 50, -4);
      ctx.quadraticCurveTo(58, 16, 62, 8);
    }, shade(color, -20));
    pathFill(ctx, () => {
      ctx.moveTo(-24, -64);
      ctx.quadraticCurveTo(8, -112, 52, -58);
      ctx.quadraticCurveTo(18, -78, -8, -52);
      ctx.quadraticCurveTo(-22, -60, -24, -64);
    }, shade(color, 18));
    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    ctx.beginPath();
    ctx.ellipse(14, -74, 16, 5, -0.65, 0, Math.PI * 2);
    ctx.fill();
  } else if (style === 'slick') {
    skullCap(ctx, g, edge, { top: -84, side: 60, brow: -36, low: -14 });
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.lineWidth = 3.2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-4, -70);
    ctx.quadraticCurveTo(20, -54, 32, -32);
    ctx.stroke();
  } else if (style === 'perm') {
    skullCap(ctx, color, shade(color, -28), { top: -76, side: 48, brow: -26, low: -10 });
    for (const [x, y, r] of [[-44, -56, 16], [2, -76, 20], [42, -54, 16], [-56, -28, 13], [56, -26, 13], [-36, -10, 11], [38, -8, 11]]) {
      ell(ctx, x, y, r, r * 0.9, color);
    }
    ell(ctx, 4, -78, 10, 5, 'rgba(255,255,255,0.22)', -0.4);
    if (!covered) {
      for (const x of [-18, 4, 24]) ell(ctx, x, -22, 9, 7, color);
    }
  } else if (style === 'bob') {
    skullCap(ctx, g, edge, { top: -88, side: 58, brow: -26, low: -6 });
    pathFill(ctx, () => {
      ctx.moveTo(-60, -10);
      ctx.quadraticCurveTo(-76, 8, -56, 44);
      ctx.quadraticCurveTo(-42, 22, -46, -2);
      ctx.quadraticCurveTo(-52, -12, -60, -10);
    }, color);
    pathFill(ctx, () => {
      ctx.moveTo(60, -10);
      ctx.quadraticCurveTo(76, 8, 56, 44);
      ctx.quadraticCurveTo(42, 22, 46, -2);
      ctx.quadraticCurveTo(52, -12, 60, -10);
    }, color);
    if (!covered) bangs(ctx, color);
    ell(ctx, -16, -62, 12, 5, 'rgba(255,255,255,0.2)', -0.5);
  } else if (style === 'long' || style === 'wavy') {
    const wavy = style === 'wavy';
    skullCap(ctx, g, edge, { top: -90, side: 58, brow: -28, low: -8 });
    sideLock(ctx, color, -52, wavy ? 150 : 172, wavy);
    sideLock(ctx, color, 54, wavy ? 162 : 172, wavy);
    if (!covered) bangs(ctx, color);
  } else if (style === 'pony') {
    skullCap(ctx, g, edge, { top: -92, side: 60, brow: -30, low: -10 });
    pathFill(ctx, () => {
      ctx.moveTo(-16, -66);
      ctx.quadraticCurveTo(12, -98, 30, -58);
      ctx.quadraticCurveTo(8, -48, -6, -54);
      ctx.closePath();
    }, shade(color, -6));
    ell(ctx, 16, -62, 8, 5, shade(color, -32));
    if (!covered) bangs(ctx, color);
    sideLock(ctx, color, -48, 72, false);
  } else if (style === 'bun') {
    skullCap(ctx, g, edge, { top: -80, side: 58, brow: -28, low: -8 });
    ell(ctx, 0, -98, 22, 18, color);
    ctx.strokeStyle = shade(color, -30);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(0, -98, 22, 18, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = shade(color, 22);
    ctx.fillRect(-6, -102, 12, 4);
    if (!covered) bangs(ctx, color);
  }
  if (luma(color) < 170 && style !== 'perm' && style !== 'slick') {
    ctx.fillStyle = 'rgba(255,255,255,0.16)';
    ctx.beginPath();
    ctx.ellipse(-12, -60, 14, 5, -0.45, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ---------- head ----------
function traceFace(ctx) {
  ctx.moveTo(0, -80);
  ctx.bezierCurveTo(46, -80, 64, -46, 60, -6);
  ctx.bezierCurveTo(58, 28, 40, 58, 20, 70);
  ctx.quadraticCurveTo(0, 80, -20, 70);
  ctx.bezierCurveTo(-40, 58, -58, 28, -60, -6);
  ctx.bezierCurveTo(-64, -46, -46, -80, 0, -80);
}

function drawHead(ctx, s, look, head) {
  const fx = head.yaw * 11;
  const fy = head.pitch * 9;
  // ears
  for (const side of [-1, 1]) {
    const vis = 1 - Math.max(0, side * head.yaw) * 0.65;
    ell(ctx, side * 60 + fx * 0.15, 8, 11 * vis, 16, shade(look.skin, -10));
    ell(ctx, side * 60 + fx * 0.15, 10, 5 * vis, 9, shade(look.skin, -22));
  }
  const skinG = ctx.createRadialGradient(-18 + fx, -28 + fy, 10, fx * 0.2, 10, 86);
  skinG.addColorStop(0, shade(look.skin, 18));
  skinG.addColorStop(0.55, look.skin);
  skinG.addColorStop(1, shade(look.skin, -16));
  pathFill(ctx, () => traceFace(ctx), skinG, shade(look.skin, -28), 1.15);

  const blushA = 0.16 + clamp(s.smile, 0, 1) * 0.2;
  ell(ctx, -40 + fx, 30 + fy, 14, 8, `rgba(255,120,140,${blushA})`);
  ell(ctx, 40 + fx, 30 + fy, 14, 8, `rgba(255,120,140,${blushA})`);

  drawEyePair(ctx, s, look, fx, fy);
  drawBrows(ctx, s, look, fx, fy);
  drawNose(ctx, look.skin, fx, fy);
  drawMouth(ctx, fx, 46 + fy, s, look.skin);
  drawHairFront(ctx, look);
  drawEarrings(ctx, look, fx);
  drawHat(ctx, look);
  drawGlasses(ctx, look, s, fx, fy);
}

const EYE_DIM = {
  round: { w: 13.2, h: 11.6, tilt: 0, lash: 0.65 },
  almond: { w: 15.4, h: 9.6, tilt: 0.18, lash: 1 },
  sharp: { w: 15.8, h: 7.6, tilt: 0.32, lash: 0.75 },
  soft: { w: 14.4, h: 10.4, tilt: -0.14, lash: 1.05 },
};

function drawEyePair(ctx, s, look, fx, fy) {
  const dim = EYE_DIM[look.eye] || EYE_DIM.almond;
  const eyes = [
    { x: -30, blink: s.blinkR, side: -1 },
    { x: 30, blink: s.blinkL, side: 1 },
  ];
  for (const e of eyes) {
    const open = clamp(1 - e.blink, 0, 1) * (1 - clamp(s.smile, 0, 1) * 0.18);
    drawEye(ctx, e.x + fx, -6 + fy, e.side, dim, open, s, look);
  }
}

function drawEye(ctx, x, y, side, dim, open, s, look) {
  const tilt = -side * dim.tilt;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(tilt);
  if (open < 0.16) {
    ctx.beginPath();
    ctx.moveTo(-dim.w, 0);
    ctx.quadraticCurveTo(0, -5 * (s.smile > 0.3 ? 1 : -0.4), dim.w, 0);
    ctx.strokeStyle = '#2c2428';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.stroke();
    ctx.restore();
    return;
  }
  const h = dim.h * open;
  ell(ctx, 0, 0, dim.w, h, '#f4f6fb');
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(0, 0, dim.w * 0.96, h * 0.96, 0, 0, Math.PI * 2);
  ctx.clip();
  const ix = clamp(s.lookX, -1, 1) * dim.w * 0.32;
  const iy = -clamp(s.lookY, -1, 1) * h * 0.38;
  const ir = Math.min(dim.w * 0.58, h * 0.92);
  const ig = ctx.createRadialGradient(ix - ir * 0.3, iy - ir * 0.3, 1, ix, iy, ir);
  ig.addColorStop(0, shade(look.eyeColor, 50));
  ig.addColorStop(0.55, look.eyeColor);
  ig.addColorStop(1, shade(look.eyeColor, -40));
  ell(ctx, ix, iy, ir, ir, ig);
  ell(ctx, ix, iy, ir * 0.48, ir * 0.48, '#1a1418');
  ell(ctx, ix + ir * 0.28, iy - ir * 0.32, ir * 0.22, ir * 0.22, '#fff');
  ell(ctx, ix - ir * 0.28, iy + ir * 0.3, ir * 0.1, ir * 0.1, 'rgba(255,255,255,0.8)');
  ctx.restore();
  // upper lid + lashes
  ctx.beginPath();
  ctx.moveTo(-dim.w, 0.5);
  ctx.quadraticCurveTo(0, -h - 1.5, dim.w, 0.2);
  ctx.strokeStyle = '#241c20';
  ctx.lineWidth = 1.8;
  ctx.lineCap = 'round';
  ctx.stroke();
  ctx.beginPath();
  const ox = side > 0 ? dim.w : -dim.w;
  ctx.moveTo(ox, 0);
  ctx.lineTo(ox + side * 4 * dim.lash, -3.5 * dim.lash);
  ctx.moveTo(ox - side * 4, -h * 0.15);
  ctx.lineTo(ox + side * 2 * dim.lash, -h * 0.55 - 2);
  ctx.strokeStyle = '#241c20';
  ctx.lineWidth = 1.15;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-dim.w * 0.8, h * 0.15);
  ctx.quadraticCurveTo(0, h * 0.85, dim.w * 0.8, h * 0.1);
  ctx.strokeStyle = 'rgba(60,40,40,0.35)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();
}

function drawBrows(ctx, s, look, fx, fy) {
  const color = shade(look.hairColor, luma(look.hairColor) > 180 ? -60 : -10);
  const up = clamp(s.browUp, 0, 1) * 8;
  const down = clamp(s.browDown, 0, 1) * 5;
  const angry = clamp(s.browDown, 0, 1) * 6;
  for (const side of [-1, 1]) {
    const x = side * 30 + fx;
    const y = -30 + fy - up + down;
    ctx.strokeStyle = color;
    ctx.lineCap = 'round';
    ctx.lineWidth = look.brow === 'thick' ? 4.4 : look.brow === 'soft' ? 2.2 : 3.1;
    ctx.beginPath();
    if (look.brow === 'straight') {
      ctx.moveTo(x - side * 16, y + angry * 0.25);
      ctx.lineTo(x + side * 16, y + 1);
    } else if (look.brow === 'arched') {
      ctx.moveTo(x - side * 15, y + 5 + angry);
      ctx.quadraticCurveTo(x + side * 2, y - 7, x + side * 16, y + 2);
    } else if (look.brow === 'thick') {
      ctx.moveTo(x - side * 17, y + 3 + angry);
      ctx.quadraticCurveTo(x, y - 1, x + side * 16, y + 3);
    } else {
      ctx.moveTo(x - side * 14, y + 3 + angry);
      ctx.quadraticCurveTo(x + side * 2, y - 3, x + side * 16, y + 1);
    }
    ctx.stroke();
  }
}

function drawNose(ctx, skin, fx, fy) {
  ctx.strokeStyle = shade(skin, -36);
  ctx.lineWidth = 1.45;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(fx * 0.25, 8 + fy);
  ctx.quadraticCurveTo(fx * 0.7 + 0.5, 20 + fy, fx, 24 + fy);
  ctx.stroke();
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(fx - 6, 26 + fy);
  ctx.quadraticCurveTo(fx - 2, 30 + fy, fx + 0.5, 27 + fy);
  ctx.moveTo(fx + 6, 26 + fy);
  ctx.quadraticCurveTo(fx + 2, 30 + fy, fx - 0.5, 27 + fy);
  ctx.stroke();
}

function drawMouth(ctx, x, y, s, skin) {
  const smile = clamp(s.smile, 0, 1);
  const jaw = clamp(s.jaw, 0, 1);
  const pucker = clamp(s.pucker, 0, 1);
  const lip = mixHex(skin, '#b14358', 0.58);
  const deep = mixHex(skin, '#6e2430', 0.72);
  ctx.lineJoin = 'round';
  if (pucker > 0.45 && jaw < 0.25) {
    ell(ctx, x, y + 1, 6.2, 7.2, lip);
    ctx.beginPath(); ctx.ellipse(x, y + 1, 6.2, 7.2, 0, 0, 7);
    ctx.strokeStyle = deep; ctx.lineWidth = 1.2; ctx.stroke();
    ell(ctx, x - 1.5, y - 1, 2, 1.2, 'rgba(255,255,255,0.35)');
    return;
  }
  const w = 12 + smile * 8 - pucker * 3;
  const lift = smile * 8;
  pathFill(ctx, () => {
    ctx.moveTo(x - w, y);
    ctx.quadraticCurveTo(x - w * 0.45, y - 4 - smile, x, y - 1);
    ctx.quadraticCurveTo(x + w * 0.45, y - 4 - smile, x + w, y);
    ctx.quadraticCurveTo(x + w * 0.2, y + 4 + lift * 0.25, x, y + 5 + lift * 0.35);
    ctx.quadraticCurveTo(x - w * 0.2, y + 4 + lift * 0.25, x - w, y);
  }, lip, deep, 1);
  ell(ctx, x, y - 1, w * 0.28, 1.3, 'rgba(255,255,255,0.28)');
  if (jaw > 0.1) {
    const ow = w * 0.72;
    const oh = 3 + jaw * 16;
    pathFill(ctx, () => {
      ctx.moveTo(x - ow, y + 3);
      ctx.quadraticCurveTo(x, y + 1, x + ow, y + 3);
      ctx.quadraticCurveTo(x + ow * 0.7, y + oh, x, y + oh + 2);
      ctx.quadraticCurveTo(x - ow * 0.7, y + oh, x - ow, y + 3);
    }, '#5c1c28');
    ctx.fillStyle = '#f3f5f7';
    const th = Math.min(5.5, 2 + oh * 0.35);
    ctx.beginPath();
    ctx.roundRect(x - ow * 0.62, y + 3, ow * 1.24, th, 2);
    ctx.fill();
    if (jaw > 0.35) ell(ctx, x, y + oh * 0.72, ow * 0.42, oh * 0.22, '#e07080');
  }
}

function drawEarrings(ctx, look, fx) {
  if (look.earrings === 'none') return;
  const metal = '#e6d39a';
  for (const side of [-1, 1]) {
    const x = side * 60 + fx * 0.1;
    const y = 20;
    if (look.earrings === 'stud') ell(ctx, x, y, 2.4, 2.4, metal);
    else if (look.earrings === 'hoop') {
      ctx.beginPath();
      ctx.arc(x, y + 4, 5, 0, Math.PI);
      ctx.strokeStyle = metal; ctx.lineWidth = 1.6; ctx.stroke();
    } else {
      ell(ctx, x, y, 1.8, 1.8, metal);
      ctx.strokeStyle = metal; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(x, y + 2); ctx.lineTo(x, y + 10); ctx.stroke();
      ell(ctx, x, y + 13, 2.6, 3.4, '#f2f4f8');
    }
  }
}

function drawHat(ctx, look) {
  if (look.hat === 'none') return;
  const hair = look.hairColor;
  if (look.hat === 'cap') {
    pathFill(ctx, () => {
      ctx.moveTo(-52, -28);
      ctx.quadraticCurveTo(-48, -78, 4, -86);
      ctx.quadraticCurveTo(52, -78, 50, -26);
      ctx.quadraticCurveTo(0, -40, -52, -28);
    }, '#2c313a', '#1b1e24', 1.2);
    pathFill(ctx, () => {
      ctx.moveTo(-20, -30);
      ctx.quadraticCurveTo(20, -18, 78, -6);
      ctx.quadraticCurveTo(24, 2, -16, -16);
      ctx.closePath();
    }, '#39404a');
    ell(ctx, 8, -70, 10, 4, 'rgba(255,255,255,0.18)', -0.4);
  } else if (look.hat === 'beret') {
    ell(ctx, 8, -70, 46, 20, '#9c3d52',  -0.35);
    ell(ctx, 14, -78, 18, 8, shade('#9c3d52', 20), -0.4);
    ell(ctx, 6, -62, 7, 4, shade('#9c3d52', -15));
  } else if (look.hat === 'beanie') {
    pathFill(ctx, () => {
      ctx.moveTo(-58, -18);
      ctx.quadraticCurveTo(-64, -70, 0, -92);
      ctx.quadraticCurveTo(64, -70, 58, -18);
      ctx.quadraticCurveTo(0, -28, -58, -18);
    }, '#3d4d6e', '#2a354c', 1.2);
    ctx.fillStyle = shade('#3d4d6e', 18);
    ctx.fillRect(-56, -28, 112, 12);
    ell(ctx, 0, -92, 8, 8, '#f2f4f8');
    void hair;
  }
}

function drawGlasses(ctx, look, s, fx, fy) {
  if (look.glasses === 'none') return;
  const y = -6 + fy;
  const x1 = -30 + fx, x2 = 30 + fx;
  const thin = look.glasses === 'thin';
  ctx.strokeStyle = thin ? 'rgba(40,40,48,0.75)' : '#2a2c33';
  ctx.lineWidth = thin ? 1.3 : 2.2;
  ctx.lineJoin = 'round';
  if (look.glasses === 'round' || thin) {
    const r = thin ? 12 : 14;
    ctx.beginPath(); ctx.arc(x1, y, r, 0, 7); ctx.stroke();
    ctx.beginPath(); ctx.arc(x2, y, r, 0, 7); ctx.stroke();
  } else {
    ctx.strokeRect(x1 - 16, y - 11, 32, 22);
    ctx.strokeRect(x2 - 16, y - 11, 32, 22);
  }
  ctx.lineWidth = thin ? 1.2 : 1.8;
  ctx.beginPath();
  ctx.moveTo(x1 + 13, y - 1); ctx.lineTo(x2 - 13, y - 1); ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x1 - 14, y - 2); ctx.lineTo(x1 - 34, y - 4);
  ctx.moveTo(x2 + 14, y - 2); ctx.lineTo(x2 + 34, y - 4);
  ctx.stroke();
  void s;
}

// ---------- arms & hands ----------
const SLEEVE = { tee: 0.38, hoodie: 1, shirt: 0.98, blazer: 1, knit: 0.95, dress: 0.22, cardigan: 0.94, leather: 1 };

function drawLimbs(ctx, s, look, lay) {
  const left = chain(lay.shL, s.uaL, s.faL, 1);
  const right = chain(lay.shR, s.uaR, s.faR, -1);
  drawArm(ctx, lay.shL, left, look, 1);
  drawArm(ctx, lay.shR, right, look, -1);
  const curlsL = [s.cL0, s.cL1, s.cL2, s.cL3, s.cL4];
  const curlsR = [s.cR0, s.cR1, s.cR2, s.cR3, s.cR4];
  drawHand(ctx, left.wrist, left.hdx, left.hdy, 1, curlsL, s.thL, s.rotL, s.palmL > 0.5, look.skin);
  drawHand(ctx, right.wrist, right.hdx, right.hdy, -1, curlsR, s.thR, s.rotR, s.palmR > 0.5, look.skin);
}

function tube(ctx, a, b, r0, r1, fill) {
  const steps = 8;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = a.x + (b.x - a.x) * t;
    const y = a.y + (b.y - a.y) * t;
    const r = r0 + (r1 - r0) * t;
    ell(ctx, x, y, r, r * 0.86, fill);
  }
}

function drawArm(ctx, sh, arm, look) {
  const color = look.outfitColor;
  const skin = look.skin;
  const sleeve = SLEEVE[look.outfit] ?? 0.5;
  const skinG = shade(skin, -6);
  tube(ctx, sh, arm.elbow, 16, 12, shade(skin, 6));
  tube(ctx, arm.elbow, arm.wrist, 12, 8.5, skinG);
  ell(ctx, arm.elbow.x, arm.elbow.y, 13, 12, shade(skin, 4));
  if (sleeve > 0.04) {
    const span = UPPER + FORE;
    const cut = Math.min(span * sleeve, span - 1);
    const along = (dist) => {
      if (dist <= UPPER) {
        const t = dist / UPPER;
        return { x: sh.x + (arm.elbow.x - sh.x) * t, y: sh.y + (arm.elbow.y - sh.y) * t };
      }
      const t = (dist - UPPER) / FORE;
      return { x: arm.elbow.x + (arm.wrist.x - arm.elbow.x) * t, y: arm.elbow.y + (arm.wrist.y - arm.elbow.y) * t };
    };
    const end = along(cut);
    if (cut <= UPPER) tube(ctx, sh, end, 17, 14, color);
    else {
      tube(ctx, sh, arm.elbow, 17, 14, color);
      tube(ctx, arm.elbow, end, 14, 11, color);
      ell(ctx, arm.elbow.x, arm.elbow.y, 14.5, 13, color);
    }
    ell(ctx, sh.x, sh.y + 2, 18, 15, color);
    if (sleeve > 0.8) ell(ctx, end.x, end.y, 11, 8, shade(color, -16));
    if (look.outfit === 'leather') ell(ctx, end.x, end.y, 7, 5, 'rgba(255,255,255,0.2)');
  }
}

function drawHand(ctx, wrist, hdx, hdy, sign, curls, th, rot, palm, skin) {
  const cs = Math.cos(rot || 0), sn = Math.sin(rot || 0);
  const rdx = hdx * cs - hdy * sn;
  const rdy = hdx * sn + hdy * cs;
  const a = Math.atan2(-rdx, rdy);
  ctx.save();
  ctx.translate(wrist.x, wrist.y);
  ctx.rotate(a);
  // local +y = fingertip direction
  const palmCol = palm ? shade(skin, 8) : shade(skin, -4);
  const g = ctx.createLinearGradient(-16, 0, 16, 40);
  g.addColorStop(0, shade(skin, 14));
  g.addColorStop(1, palmCol);
  pathFill(ctx, () => {
    ctx.roundRect(-16, 6, 32, 34, 12);
  }, g, shade(skin, -30), 1);
  // knuckle hint on the back of the hand
  if (!palm) {
    ctx.strokeStyle = 'rgba(120,70,50,0.18)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-12, 34); ctx.quadraticCurveTo(0, 30, 12, 34); ctx.stroke();
  } else {
    ctx.strokeStyle = 'rgba(120,70,50,0.22)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-8, 18); ctx.quadraticCurveTo(0, 22, 8, 18); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-6, 24); ctx.quadraticCurveTo(0, 27, 6, 24); ctx.stroke();
  }

  const avg = ((curls[1] || 0) + (curls[2] || 0) + (curls[3] || 0) + (curls[4] || 0)) / 4;
  const spread = 0.16 + (1 - avg) * 0.14;
  const fingers = [
    { c: curls[4] || 0, x: 11.5, ang: spread * 1.05, w: 6.2, len: 24 },
    { c: curls[3] || 0, x: 4.2, ang: spread * 0.38, w: 7.1, len: 30 },
    { c: curls[2] || 0, x: -3.2, ang: -spread * 0.32, w: 7.4, len: 33 },
    { c: curls[1] || 0, x: -10.5, ang: -spread * 0.95, w: 6.8, len: 30 },
  ];
  for (const f of fingers) drawFinger(ctx, f.x, 36, f.ang, f.c, f.w, f.len, skin, !palm);

  drawThumb(ctx, sign, curls[0] || 0, th || 0, skin, a, !palm);
  ctx.restore();
}

function drawFinger(ctx, x, y, ang, curl, width, len, skin, nails) {
  const c = clamp(curl, 0, 1);
  const extend = 1 - c * 0.8;
  const bend = c * 1.25;
  let px = x, py = y;
  let dx = Math.sin(ang), dy = Math.cos(ang);
  const seg = [len * 0.38, len * 0.34, len * 0.28];
  const widths = [width, width * 0.86, width * 0.7];
  const pts = [{ x: px, y: py }];
  for (let i = 0; i < 3; i++) {
    const ba = bend * (i === 0 ? 0.45 : 1);
    const cs = Math.cos(ba), sn = Math.sin(ba);
    const ndx = dx * cs - dy * sn;
    const ndy = dx * sn + dy * cs;
    dx = ndx; dy = ndy;
    px += dx * seg[i] * (0.55 + 0.45 * extend);
    py += dy * seg[i] * (0.55 + 0.45 * extend);
    pts.push({ x: px, y: py });
  }
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(pts[i].x, pts[i].y);
    ctx.lineTo(pts[i + 1].x, pts[i + 1].y);
    ctx.strokeStyle = i === 0 ? shade(skin, -8) : skin;
    ctx.lineWidth = widths[i];
    ctx.lineCap = 'round';
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(pts[i].x, pts[i].y);
    ctx.lineTo(pts[i + 1].x, pts[i + 1].y);
    ctx.strokeStyle = 'rgba(255,255,255,0.22)';
    ctx.lineWidth = Math.max(1, widths[i] * 0.28);
    ctx.stroke();
  }
  if (nails && c < 0.72) {
    const tip = pts[3], prev = pts[2];
    const angN = Math.atan2(tip.y - prev.y, tip.x - prev.x);
    ctx.save();
    ctx.translate(tip.x, tip.y);
    ctx.rotate(angN);
    ell(ctx, 1.5, 0, 2.6, 1.7, mixHex(skin, '#f4d2d4', 0.45));
    ctx.restore();
  }
}

function drawThumb(ctx, sign, curl, th, skin, rotA, nails) {
  // Thumb lives on the inner edge of each hand. `th` points it toward screen-up.
  const upLocalX = -Math.sin(rotA);
  const upLocalY = -Math.cos(rotA);
  const restX = -sign;
  const restY = 0.35;
  const t = clamp((th - 0.05) / 0.9, 0, 1);
  let dx = restX * (1 - t) + upLocalX * t;
  let dy = restY * (1 - t) + upLocalY * t;
  const mag = Math.hypot(dx, dy) || 1;
  dx /= mag; dy /= mag;
  const c = clamp(curl, 0, 1);
  const len = 18 * (1 - c * 0.65) + 8;
  const x0 = -sign * 14;
  const y0 = 18;
  const x1 = x0 + dx * len;
  const y1 = y0 + dy * len;
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.strokeStyle = shade(skin, -6);
  ctx.lineWidth = 8.5;
  ctx.lineCap = 'round';
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.strokeStyle = 'rgba(255,255,255,0.2)';
  ctx.lineWidth = 2;
  ctx.stroke();
  if (nails && c < 0.6 && t < 0.85) {
    ell(ctx, x1, y1, 2.4, 1.8, mixHex(skin, '#f4d2d4', 0.4));
  }
}
