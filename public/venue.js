// Illustrated venue backdrops (background + foreground table) drawn on canvas.
export const VENUES = {
  cafe: { name: '카페', emoji: '☕', desc: '창가 햇살 카페' },
  restaurant: { name: '식당', emoji: '🍝', desc: '촛불 켜진 레스토랑' },
  bar: { name: '술집', emoji: '🍸', desc: '네온 조명 바' },
};

function rect(ctx, x, y, w, h, c) { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); }
function rr(ctx, x, y, w, h, r, c) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.fillStyle = c; ctx.fill(); }
function circ(ctx, x, y, r, c) { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fillStyle = c; ctx.fill(); }

export function drawBackground(ctx, w, h, venue, t = 0) {
  const floorY = h * 0.62;
  if (venue === 'cafe') {
    rect(ctx, 0, 0, w, floorY, '#f3e3cc');
    // wainscot
    rect(ctx, 0, floorY - h * 0.12, w, h * 0.12, '#d9b892');
    // window
    const wx = w * 0.08, wy = h * 0.08, ww = w * 0.42, wh = h * 0.32;
    const sky = ctx.createLinearGradient(0, wy, 0, wy + wh);
    sky.addColorStop(0, '#9fd3f5'); sky.addColorStop(1, '#e6f6ff');
    rr(ctx, wx, wy, ww, wh, 10, sky);
    circ(ctx, wx + ww * 0.25 + Math.sin(t / 4000) * 6, wy + wh * 0.35, wh * 0.12, 'rgba(255,255,255,0.9)');
    circ(ctx, wx + ww * 0.34 + Math.sin(t / 4000) * 6, wy + wh * 0.32, wh * 0.15, 'rgba(255,255,255,0.9)');
    ctx.strokeStyle = '#8b5e3c'; ctx.lineWidth = 8; ctx.strokeRect(wx, wy, ww, wh);
    ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(wx + ww / 2, wy); ctx.lineTo(wx + ww / 2, wy + wh); ctx.stroke();
    // shelf with cups
    const sx = w * 0.6, sy = h * 0.22;
    rect(ctx, sx, sy, w * 0.34, 8, '#8b5e3c');
    ['#e07a5f', '#ffffff', '#81b29a', '#f2cc8f'].forEach((c, i) => rr(ctx, sx + 10 + i * w * 0.08, sy - 26, w * 0.05, 26, 5, c));
    rect(ctx, sx, sy + h * 0.12, w * 0.34, 8, '#8b5e3c');
    circ(ctx, sx + w * 0.08, sy + h * 0.12 - 16, 16, '#6aa84f'); rr(ctx, sx + w * 0.06, sy + h * 0.12 - 12, 26, 14, 3, '#c0683f');
    // hanging lamps
    for (const lx of [w * 0.3, w * 0.72]) {
      ctx.strokeStyle = '#333'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(lx, 0); ctx.lineTo(lx, h * 0.06); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(lx - 18, h * 0.09); ctx.lineTo(lx, h * 0.055); ctx.lineTo(lx + 18, h * 0.09); ctx.fillStyle = '#2f4f4f'; ctx.fill();
      const glow = ctx.createRadialGradient(lx, h * 0.1, 2, lx, h * 0.1, h * 0.18);
      glow.addColorStop(0, 'rgba(255,230,160,0.55)'); glow.addColorStop(1, 'rgba(255,230,160,0)');
      ctx.fillStyle = glow; ctx.fillRect(lx - h * 0.2, 0, h * 0.4, h * 0.35);
    }
    // floor
    rect(ctx, 0, floorY, w, h - floorY, '#b98b5e');
    ctx.strokeStyle = 'rgba(0,0,0,0.08)'; ctx.lineWidth = 2;
    for (let x = -w; x < w * 2; x += 60) { ctx.beginPath(); ctx.moveTo(x, floorY); ctx.lineTo(x + (x - w / 2) * 0.6, h); ctx.stroke(); }
  } else if (venue === 'restaurant') {
    rect(ctx, 0, 0, w, floorY, '#7a2e3a');
    ctx.fillStyle = 'rgba(255,215,160,0.08)';
    for (let x = 0; x < w; x += 36) for (let y = 0; y < floorY; y += 36) { ctx.beginPath(); ctx.arc(x + ((y / 36) % 2) * 18, y, 5, 0, 7); ctx.fill(); }
    rect(ctx, 0, floorY - h * 0.1, w, h * 0.1, '#4a1a22');
    // framed paintings
    const fr = (x, y, fw, fh) => {
      rr(ctx, x - 6, y - 6, fw + 12, fh + 12, 4, '#d4a64a');
      const g = ctx.createLinearGradient(0, y, 0, y + fh); g.addColorStop(0, '#f6d7a7'); g.addColorStop(1, '#6b8f71');
      rect(ctx, x, y, fw, fh, g); circ(ctx, x + fw * 0.7, y + fh * 0.3, fh * 0.12, '#fff3d0');
    };
    fr(w * 0.1, h * 0.1, w * 0.26, h * 0.16); fr(w * 0.64, h * 0.12, w * 0.24, h * 0.14);
    // wall sconces
    for (const lx of [w * 0.5]) {
      const glow = ctx.createRadialGradient(lx, h * 0.12, 2, lx, h * 0.12, h * 0.2);
      glow.addColorStop(0, 'rgba(255,200,120,0.6)'); glow.addColorStop(1, 'rgba(255,200,120,0)');
      ctx.fillStyle = glow; ctx.fillRect(lx - h * 0.2, 0, h * 0.4, h * 0.35);
      rr(ctx, lx - 8, h * 0.1, 16, 26, 4, '#d4a64a');
    }
    rect(ctx, 0, floorY, w, h - floorY, '#3a2a24');
    ctx.fillStyle = 'rgba(255,255,255,0.04)';
    for (let x = 0; x < w; x += 50) for (let y = floorY; y < h; y += 50) if (((x + y) / 50) % 2 < 1) ctx.fillRect(x, y, 50, 50);
  } else { // bar
    const g = ctx.createLinearGradient(0, 0, 0, floorY);
    g.addColorStop(0, '#120c2a'); g.addColorStop(1, '#2a1b4a');
    rect(ctx, 0, 0, w, floorY, g);
    // bottle shelves
    for (let row = 0; row < 2; row++) {
      const y = h * (0.2 + row * 0.15);
      rect(ctx, w * 0.05, y, w * 0.9, 6, '#5a3d2b');
      const colors = ['#2e8b57', '#c0392b', '#f1c40f', '#8e44ad', '#16a085', '#d35400'];
      for (let i = 0; i < 9; i++) {
        const bx = w * 0.08 + i * w * 0.095, bh = 34 + ((i * 7 + row * 3) % 4) * 6;
        rr(ctx, bx, y - bh, 16, bh, 4, colors[(i + row) % colors.length]);
        rect(ctx, bx + 5, y - bh - 10, 6, 12, colors[(i + row) % colors.length]);
        ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillRect(bx + 3, y - bh + 6, 3, bh - 12);
      }
    }
    // neon sign
    const flick = 0.85 + 0.15 * Math.sin(t / 180) * Math.sin(t / 530);
    ctx.save();
    ctx.font = `bold ${Math.round(Math.min(h * 0.045, w * 0.07))}px sans-serif`; ctx.textAlign = 'center';
    ctx.shadowColor = '#ff4fd8'; ctx.shadowBlur = 22; ctx.fillStyle = `rgba(255,120,230,${flick})`;
    ctx.fillText('♥ BLIND BAR ♥', w * 0.42, h * 0.14);
    ctx.restore();
    rect(ctx, 0, floorY, w, h - floorY, '#1a1226');
  }
}

export function drawTable(ctx, w, h, venue, tableNo) {
  const ty = h * 0.7;
  const tw = Math.min(w * 0.96, h * 0.75);
  const tx = (w - tw) / 2;
  const top = { cafe: '#e8c9a0', restaurant: '#f5f0e6', bar: '#3b2a1e' }[venue];
  const edge = { cafe: '#a8784c', restaurant: '#d8cfc0', bar: '#24180f' }[venue];
  // shadow
  ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.ellipse(w / 2, ty + h * 0.27, tw * 0.5, h * 0.03, 0, 0, 7); ctx.fill();
  rr(ctx, tx, ty, tw, h * 0.06, 18, top);
  rect(ctx, tx + 10, ty + h * 0.05, tw - 20, h * 0.03, edge);
  rect(ctx, w / 2 - 12, ty + h * 0.08, 24, h * 0.2, edge);
  if (venue === 'restaurant') { // tablecloth drape
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.moveTo(tx, ty + 10); ctx.lineTo(tx + tw, ty + 10);
    ctx.lineTo(tx + tw - 8, ty + h * 0.12); ctx.lineTo(tx + 8, ty + h * 0.12); ctx.fill();
  }
  // props
  const py = ty + h * 0.015;
  if (venue === 'cafe') {
    for (const px of [tx + tw * 0.18, tx + tw * 0.82]) {
      rr(ctx, px - 16, py - 26, 32, 30, 6, '#ffffff');
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(px + 18, py - 12, 7, -1.4, 1.4); ctx.stroke();
      ctx.fillStyle = '#6b3e26'; ctx.beginPath(); ctx.ellipse(px, py - 25, 13, 3, 0, 0, 7); ctx.fill();
    }
  } else if (venue === 'restaurant') {
    // candle
    rr(ctx, w / 2 - 5, py - 34, 10, 34, 3, '#fff6d8');
    const glow = ctx.createRadialGradient(w / 2, py - 42, 1, w / 2, py - 42, 40);
    glow.addColorStop(0, 'rgba(255,200,90,0.9)'); glow.addColorStop(1, 'rgba(255,200,90,0)');
    ctx.fillStyle = glow; ctx.fillRect(w / 2 - 40, py - 82, 80, 80);
    circ(ctx, w / 2, py - 40, 5, '#ffb030');
    for (const px of [tx + tw * 0.2, tx + tw * 0.8]) { ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.ellipse(px, py, 34, 8, 0, 0, 7); ctx.fill(); }
  } else {
    for (const px of [tx + tw * 0.2, tx + tw * 0.8]) {
      ctx.fillStyle = 'rgba(200,230,255,0.55)';
      ctx.beginPath(); ctx.moveTo(px - 18, py - 40); ctx.lineTo(px + 18, py - 40); ctx.lineTo(px, py - 18); ctx.fill();
      ctx.fillStyle = 'rgba(255,90,140,0.8)'; ctx.beginPath(); ctx.moveTo(px - 12, py - 36); ctx.lineTo(px + 12, py - 36); ctx.lineTo(px, py - 22); ctx.fill();
      rect(ctx, px - 1.5, py - 18, 3, 16, 'rgba(200,230,255,0.7)');
      ctx.fillStyle = 'rgba(200,230,255,0.7)'; ctx.beginPath(); ctx.ellipse(px, py - 2, 9, 2.5, 0, 0, 7); ctx.fill();
    }
  }
  // table-number tent card
  const cw = 56, ch = 40, cx = w / 2 - cw / 2, cy = py - ch - (venue === 'restaurant' ? 0 : 2);
  const cxx = venue === 'restaurant' ? tx + tw * 0.5 + 60 : cx;
  rr(ctx, cxx, cy, cw, ch, 6, '#fffdf7');
  ctx.strokeStyle = 'rgba(0,0,0,0.15)'; ctx.lineWidth = 1.5; ctx.strokeRect(cxx + 3, cy + 3, cw - 6, ch - 6);
  ctx.fillStyle = '#333'; ctx.textAlign = 'center';
  ctx.font = 'bold 10px sans-serif'; ctx.fillText('TABLE', cxx + cw / 2, cy + 14);
  ctx.font = 'bold 18px sans-serif'; ctx.fillText(String(tableNo), cxx + cw / 2, cy + 33);
}
