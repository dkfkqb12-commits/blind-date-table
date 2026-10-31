// Headless Chrome smoke test: fake camera, two clients, upper-body avatars.
// Usage: PORT=8099 node test/browser-test.mjs
// Optional: PUPPETEER_SPEC=file:///path/to/puppeteer-core.js
import fs from 'fs';

const puppeteerMod = await import(process.env.PUPPETEER_SPEC || 'puppeteer-core');
const puppeteer = puppeteerMod.default;

const PORT = process.env.PORT || 8099;
const BASE = `http://127.0.0.1:${PORT}`;
const CHROME = process.env.CHROME || '/usr/bin/google-chrome';
const OUT = process.env.SHOT_DIR || '/tmp/blind-shots';
fs.mkdirSync(OUT, { recursive: true });

const pageErrors = [];
function watch(page, name) {
  page.on('pageerror', (e) => pageErrors.push(`${name} pageerror: ${e.message}`));
  page.on('console', (msg) => {
    if (msg.type() === 'error') pageErrors.push(`${name} console: ${msg.text()}`);
  });
}

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: [
    '--no-sandbox',
    '--disable-dev-shm-usage',
    '--use-fake-ui-for-media-stream',
    '--use-fake-device-for-media-stream',
    '--autoplay-policy=no-user-gesture-required',
    '--disable-background-timer-throttling',
    '--disable-backgrounding-occluded-windows',
    '--disable-renderer-backgrounding',
  ],
  defaultViewport: { width: 390, height: 844, deviceScaleFactor: 2 },
});

let failed = 0;
function assert(cond, msg) {
  if (!cond) { failed++; console.error('FAIL', msg); }
  else console.log('ok', msg);
}

async function shot(page, name, opts = {}) {
  const file = `${OUT}/${name}.png`;
  await page.screenshot({ path: file, ...opts });
  console.log('shot', file);
  return file;
}

const page = await browser.newPage();
watch(page, 'A');
await page.goto(BASE, { waitUntil: 'networkidle0', timeout: 30000 });
await page.waitForSelector('#editPreview');

const draw = await page.evaluate(async () => {
  const mod = await import('/avatar.js');
  const look = { ...mod.DEFAULT_LOOK };
  const W = 480, H = 640;
  function stats(state, pass) {
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.clearRect(0, 0, W, H);
    mod.drawAvatar(ctx, W / 2, 300, 440, { ...mod.NEUTRAL, ...state }, look, { pass, time: 1000 });
    const img = ctx.getImageData(0, 0, W, H).data;
    let left = 0, right = 0, upper = 0, n = 0, minY = H;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        if (img[(y * W + x) * 4 + 3] > 24) {
          n++;
          if (x < W / 2) left++; else right++;
          if (y < 260) upper++;
          if (y < minY) minY = y;
        }
      }
    }
    return { n, left, right, upper, minY };
  }
  const rest = stats({}, 'limbs');
  const raised = stats({ uaL: 2.6, faL: -0.35, pose: 1, handL: 1, cL1: 0.05, cL2: 0.05, cL3: 0.08, cL4: 0.1, palmL: 1 }, 'limbs');
  const body = stats({}, 'body');
  let threw = null;
  try {
    const c = document.createElement('canvas');
    c.width = 200; c.height = 260;
    const ctx = c.getContext('2d');
    for (const hair of Object.keys(mod.HAIRS)) {
      for (const outfit of Object.keys(mod.OUTFITS)) {
        mod.drawAvatar(ctx, 100, 130, 180, mod.NEUTRAL, {
          ...look, hair, outfit, glasses: 'round', earrings: 'hoop', hat: hair === 'bun' ? 'beret' : 'none',
        }, { pass: 'all', time: 500 });
      }
    }
  } catch (e) { threw = String(e); }
  // contact sheet for visual review
  const hairs = Object.keys(mod.HAIRS);
  const outfits = Object.keys(mod.OUTFITS);
  const cw = 200, ch = 260;
  const sheet = document.createElement('canvas');
  const cols = Math.max(hairs.length, outfits.length, 5);
  sheet.width = cols * cw;
  sheet.height = ch * 3;
  const sctx = sheet.getContext('2d');
  sctx.fillStyle = '#fff4f2';
  sctx.fillRect(0, 0, sheet.width, sheet.height);
  const paint = (state, lk, col, row) => {
    const ox = col * cw, oy = row * ch;
    sctx.save();
    sctx.beginPath();
    sctx.rect(ox, oy, cw, ch);
    sctx.clip();
    sctx.fillStyle = '#ffe7ee';
    sctx.fillRect(ox, oy, cw, ch);
    mod.drawAvatar(sctx, ox + cw / 2, oy + 150, 190, { ...mod.NEUTRAL, ...state }, lk, { pass: 'all', time: 800 });
    sctx.restore();
  };
  hairs.forEach((h, i) => paint({}, { ...look, hair: h, hat: 'none' }, i, 0));
  outfits.forEach((o, i) => paint({}, { ...look, outfit: o, hair: 'bob', outfitColor: o === 'leather' ? '#1c1c1f' : o === 'dress' ? '#c23b4a' : '#2f5f93' }, i, 1));
  const gestures = [
    [{}, 'rest'],
    [{ uaL: 2.55, faL: -0.2, handL: 1, palmL: 1, cL0: 0.1, cL1: 0.05, cL2: 0.05, cL3: 0.08, cL4: 0.12, smile: 0.55 }, 'wave'],
    [{ uaR: 0.9, faR: -0.35, handR: 1, cR0: 0.4, cR1: 0.05, cR2: 0.92, cR3: 0.92, cR4: 0.92 }, 'point'],
    [{ uaL: 1.15, faL: -2.35, handL: 1, thL: 0.95, cL0: 0.1, cL1: 0.9, cL2: 0.92, cL3: 0.92, cL4: 0.9 }, 'thumb'],
    [{ handL: 1, handR: 1, cL0: 0.9, cL1: 0.95, cL2: 0.95, cL3: 0.95, cL4: 0.95, cR0: 0.9, cR1: 0.95, cR2: 0.95, cR3: 0.95, cR4: 0.95 }, 'fist'],
  ];
  gestures.forEach(([st], i) => paint(st, { ...look, hair: 'long', outfit: 'tee', outfitColor: '#f4f1ec' }, i, 2));
  return { rest, raised, body, threw, sheet: sheet.toDataURL('image/png'), hairs: hairs.length, outfits: outfits.length };
});

fs.writeFileSync(`${OUT}/gallery.png`, Buffer.from(draw.sheet.split(',')[1], 'base64'));
console.log('gallery', `${OUT}/gallery.png`, 'rest', draw.rest, 'raised', draw.raised, 'body', draw.body);
assert(!draw.threw, `draw all styles (${draw.threw})`);
assert(draw.hairs >= 8 && draw.outfits >= 8, 'catalog size');
assert(draw.body.n > 800, `body pixels ${draw.body.n}`);
assert(draw.rest.left > 80 && draw.rest.right > 80, `both arms at rest L=${draw.rest.left} R=${draw.rest.right}`);
assert(draw.raised.upper > draw.rest.upper + 30, `raised hand reaches up (${draw.rest.upper} -> ${draw.raised.upper})`);
assert(draw.raised.minY < draw.rest.minY - 10, `raised hand minY ${draw.raised.minY} < ${draw.rest.minY}`);
if (process.env.GALLERY_ONLY) {
  await browser.close();
  process.exit(failed ? 1 : 0);
}

const context = browser.defaultBrowserContext();
await context.overridePermissions(BASE, ['geolocation']);
await page.setGeolocation({ latitude: 37.5172, longitude: 127.0473 });
const phoneA = `010${String(Date.now()).slice(-8)}`;
await page.evaluate((phone) => {
  document.getElementById('gateNick').value = '하늘';
  document.getElementById('gateYear').value = '1995';
  document.querySelector('#genderOpts [data-g="female"]').click();
  document.getElementById('vName').value = '김하늘';
  document.getElementById('vBirth').value = '1995-04-12';
  document.getElementById('vPhone').value = phone;
}, phoneA);
await page.$eval('#gate', (el) => el.scrollTo?.(0, 0));
await shot(page, 'onboarding');
await page.click('#verifyBtn');
await page.waitForFunction(() => document.getElementById('verifyMsg').textContent.includes('완료'), { timeout: 8000 });
await page.$eval('#verifyMsg', (el) => el.scrollIntoView({ block: 'center' }));
await shot(page, 'verification');
await page.$eval('#geoBtn', (el) => el.click());
await page.waitForFunction(() => document.getElementById('regionResult').textContent.includes('강남'), { timeout: 8000 });
await page.$eval('#regionResult', (el) => el.scrollIntoView({ block: 'center' }));
await shot(page, 'region-verified');
await page.$eval('#gateDone', (el) => el.click());
await page.waitForSelector('#entry.active', { timeout: 8000 });
await page.evaluate(() => window.scrollTo(0, 0));
await shot(page, 'region-lobby');

// Entry / customization
assert(await page.$('#lookOpts button[data-v="twoblock"]'), 'two-block hairstyle is offered');
assert(await page.$('#lookOpts button[data-v="leather"]'), 'leather jacket is offered');
assert(await page.$('.frame-hint'), 'camera framing hint is on the entry screen');
await page.evaluate(() => {
  for (const sel of [
    'button[data-k="hair"][data-v="pony"]',
    'button[data-k="outfit"][data-v="blazer"]',
    'button[data-k="glasses"][data-v="round"]',
    'button[data-k="earrings"][data-v="hoop"]',
  ]) document.querySelector(`#lookOpts ${sel}`).click();
});
const lookA = await page.evaluate(() => window.__app.look);
assert(lookA.hair === 'pony' && lookA.outfit === 'blazer' && lookA.glasses === 'round', `look applied ${JSON.stringify(lookA)}`);
await page.evaluate(() => document.getElementById('editPreview').scrollIntoView({ block: 'center' }));
await shot(page, 'entry-custom');
await shot(page, 'entry', { fullPage: true });

const table = 7;
await page.$eval('#nick', (el) => { el.value = '하늘'; });
await page.$eval('#table', (el, n) => { el.value = String(n); el.dispatchEvent(new Event('input', { bubbles: true })); }, table);
await page.click('#enterBtn');
await page.waitForSelector('#room.active', { timeout: 15000 });

async function seedUser(nick, phone) {
  const headers = { 'Content-Type': 'application/json' };
  const session = await fetch(`${BASE}/api/session`, { method: 'POST', headers, body: '{}' }).then((r) => r.json());
  headers.Authorization = `Bearer ${session.token}`;
  const post = (path, body) => fetch(`${BASE}${path}`, { method: 'POST', headers, body: JSON.stringify(body) }).then((r) => r.json());
  const profile = await post('/api/profile', { nick, gender: 'male', birthYear: 1994 });
  const verified = await post('/api/verify/test', { name: nick, birthdate: '1994-03-03', phone });
  const region = await post('/api/region', { lat: 37.5172, lng: 127.0473 });
  if (!profile.user || !verified.user || !region.region) throw new Error(`seed failed ${JSON.stringify({ profile, verified, region })}`);
  return session.token;
}
const tokenB = await seedUser('바다', `010${String(Date.now() + 17).slice(-8)}`);
const pageB = await browser.newPage();
watch(pageB, 'B');
await pageB.setGeolocation({ latitude: 37.5172, longitude: 127.0473 });
await pageB.goto(BASE, { waitUntil: 'domcontentloaded' });
await pageB.evaluate((token) => localStorage.setItem('btToken', token), tokenB);
await pageB.reload({ waitUntil: 'domcontentloaded' });
await pageB.waitForSelector('#entry.active', { timeout: 8000 });
await pageB.evaluate((n) => {
  const app = window.__app;
  app.look = { ...app.look, hair: 'twoblock', hairColor: '#1b1918', outfit: 'leather', outfitColor: '#1c1c1f', glasses: 'square', skin: '#c68655', earrings: 'stud', hat: 'none', eye: 'sharp', brow: 'straight' };
  app.venue = 'cafe';
  document.getElementById('nick').value = '바다';
  document.getElementById('table').value = String(n);
}, table);
await pageB.click('#enterBtn');
await pageB.waitForSelector('#room.active', { timeout: 15000 });

await page.waitForFunction(() => window.__app.peer && window.__app.peer.nick === '바다', { timeout: 10000 });
await pageB.waitForFunction(() => window.__app.peer && window.__app.peer.nick === '하늘', { timeout: 10000 });
const peerLooks = await Promise.all([page, pageB].map((p) => p.evaluate(() => ({
  me: window.__app.look.hair,
  peerHair: window.__app.peer.avatar.hair,
  peerOutfit: window.__app.peer.avatar.outfit,
  frames: window.__app.frames,
}))));
console.log('peers', peerLooks);
assert(peerLooks[0].peerHair === 'twoblock' && peerLooks[0].peerOutfit === 'leather', 'A sees B appearance');
assert(peerLooks[1].peerHair === 'pony' && peerLooks[1].peerOutfit === 'blazer', 'B sees A appearance');
await page.bringToFront();
await page.waitForFunction(() => window.__app.frames > 8, { timeout: 8000 });
await pageB.bringToFront();
await pageB.waitForFunction(() => window.__app.frames > 8, { timeout: 8000 });

// Let models try to load, then confirm they did not throw.
await new Promise((r) => setTimeout(r, 8000));
const modelState = await page.evaluate(() => ({
  models: window.__app.models,
  note: window.__app.modelNote,
  track: document.getElementById('trackState').textContent,
  errors: window.__app.errors.slice(),
}));
console.log('models', modelState);

await page.evaluate(() => document.getElementById('peerLiked').classList.remove('show'));
await pageB.evaluate(() => document.getElementById('peerLiked').classList.remove('show'));
await page.$eval('#reportBtn', (el) => el.click());
await page.waitForSelector('#reportModal:not(.hidden)', { timeout: 5000 });
await shot(page, 'report');
await page.$eval('#reportClose', (el) => el.click());
await shot(page, 'room-rest');
await shot(pageB, 'room-rest-b');

// B raises their left arm (partner view: screen right) with an open hand.
await page.bringToFront();
await pageB.evaluate(async () => {
  const { encode, NEUTRAL } = await import('/avatar.js');
  const st = {
    ...NEUTRAL,
    smile: 0.62, jaw: 0.15, pose: 1, handL: 1, handR: 1, palmL: 1,
    uaL: 2.45, faL: -0.25, uaR: 0.4, faR: -0.95,
    cL0: 0.08, cL1: 0.04, cL2: 0.05, cL3: 0.08, cL4: 0.12,
    thL: 0.15,
  };
  window.__app.ws.send(JSON.stringify({ type: 'motion', data: encode(st) }));
});
await page.waitForFunction(() => window.__app.stats.recv > 0 && window.__app.partnerShown.uaL > 1.4, { timeout: 8000 });
await new Promise((r) => setTimeout(r, 250));
await page.evaluate(() => document.getElementById('frameHint').classList.add('hidden'));
await shot(page, 'room-wave');

const errs = await page.evaluate(() => window.__app.errors.slice());
const errsB = await pageB.evaluate(() => window.__app.errors.slice());
console.log('app errors', errs, errsB);
const serious = [...pageErrors, ...errs.map((e) => 'A ' + e), ...errsB.map((e) => 'B ' + e)]
  .filter((e) => !/favicon|404|TensorFlow Lite|XNNPACK|INFO:|net::ERR_BLOCKED_BY_CLIENT|WebGL/i.test(e));
if (serious.length) {
  console.error('JS errors:\n' + serious.join('\n'));
  failed++;
} else console.log('ok no JS errors');

await browser.close();
if (failed) {
  console.error(`${failed} failed`);
  process.exit(1);
}
console.log('browser-test passed');
