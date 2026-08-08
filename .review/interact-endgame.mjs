import { chromium, devices } from '@playwright/test';
import fs from 'node:fs';

const BASE = 'http://localhost:4173/rs3-leaderboard';
const OUT = '.review/shots/mobile-endgame/interact';
fs.mkdirSync(OUT, { recursive: true });

const b = await chromium.launch();
const ctx = await b.newContext({
  viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true,
  deviceScaleFactor: 1, userAgent: devices['iPhone 13'].userAgent, reducedMotion: 'reduce',
});
const p = await ctx.newPage();
p.on('console', (m) => { if (m.type() === 'error') console.log('CONSOLE ERROR:', m.text()); });
const shot = (n) => p.screenshot({ path: `${OUT}/${n}.png` });
const H = () => p.evaluate(() => document.documentElement.scrollHeight);

// ---------- /pvm ----------
await p.goto(BASE + '/pvm/', { waitUntil: 'networkidle' });
await p.waitForTimeout(900);

// truncated chips: measure how many elements are ellipsed
const trunc = await p.evaluate(() => {
  const out = [];
  document.querySelectorAll('*').forEach((el) => {
    if (el.children.length === 0 && el.scrollWidth > el.clientWidth + 1 && el.clientWidth > 20) {
      out.push({ tag: el.tagName, cls: el.className?.toString().slice(0, 60), text: el.textContent.trim().slice(0, 50), clientW: el.clientWidth, scrollW: el.scrollWidth, title: el.getAttribute('title') });
    }
  });
  return out;
});
console.log('PVM truncated elements:', trunc.length);
console.log(JSON.stringify(trunc.slice(0, 12), null, 1));

// section headers clickable?
const heads = await p.evaluate(() => [...document.querySelectorAll('h3')].map((h) => ({
  t: h.textContent.trim().slice(0, 40), tag: h.closest('button,summary,[role=button]')?.tagName || 'none',
})));
console.log('PVM h3 wrappers:', JSON.stringify(heads));

// tier filter
const before = await p.evaluate(() => document.body.innerText.length);
await p.getByRole('button', { name: /^apex/i }).first().click();
await p.waitForTimeout(500);
const after = await p.evaluate(() => document.body.innerText.length);
console.log('PVM apex filter: textlen', before, '->', after, 'height', await H());
await shot('pvm-apex');

// ready only
await p.getByRole('button', { name: /^all/i }).first().click();
await p.waitForTimeout(300);
const rb = p.getByRole('button', { name: /ready only/i }).first();
await rb.click();
await p.waitForTimeout(500);
console.log('PVM ready-only -> height', await H(), 'textlen', await p.evaluate(() => document.body.innerText.length));
await shot('pvm-readyonly');
await rb.click();
await p.waitForTimeout(300);

// mode filter GROUP
await p.getByRole('button', { name: /^group$/i }).first().click();
await p.waitForTimeout(500);
console.log('PVM group filter -> height', await H());
await shot('pvm-group');
await p.getByRole('button', { name: /^any$/i }).first().click();
await p.waitForTimeout(300);

// kills counter
const plus = p.locator('button', { hasText: /^\+$/ }).first();
const cnt = await plus.count();
console.log('PVM plus buttons:', cnt);
if (cnt) {
  const box = await plus.boundingBox();
  console.log('PVM plus button size:', box);
  await plus.click(); await p.waitForTimeout(200);
  await plus.click(); await p.waitForTimeout(400);
  const kills = await p.evaluate(() => {
    const el = [...document.querySelectorAll('*')].find((e) => /KILLS LOGGED/i.test(e.textContent) && e.children.length < 6);
    return el ? el.innerText.replace(/\n/g, ' | ') : 'not found';
  });
  console.log('PVM after 2x plus, kills header:', kills);
  await p.evaluate(() => window.scrollTo(0, 0));
  await p.waitForTimeout(400);
  await shot('pvm-after-kills');
}

// ---------- /gear ----------
await p.goto(BASE + '/gear/', { waitUntil: 'networkidle' });
await p.waitForTimeout(900);
const gTrunc = await p.evaluate(() => [...document.querySelectorAll('*')].filter((el) => el.children.length === 0 && el.scrollWidth > el.clientWidth + 1 && el.clientWidth > 20).map((el) => el.textContent.trim().slice(0, 40)));
console.log('GEAR truncated:', gTrunc.length, JSON.stringify(gTrunc.slice(0, 8)));

const owned = p.locator('input[type=checkbox]');
const oc = await owned.count();
console.log('GEAR checkboxes:', oc);
if (oc) {
  const lbl = p.locator('label', { hasText: /^Owned$/ }).first();
  console.log('GEAR owned label box:', await lbl.boundingBox().catch(() => null));
  console.log('GEAR checkbox box:', await owned.first().boundingBox().catch(() => null));
  await owned.first().click({ force: true });
  await p.waitForTimeout(600);
  const hdr = await p.evaluate(() => document.body.innerText.slice(0, 400).replace(/\n/g, ' | '));
  console.log('GEAR after owned click header:', hdr);
  await p.evaluate(() => window.scrollTo(0, 0));
  await p.waitForTimeout(400);
  await shot('gear-owned');
}
// style tab
await p.getByRole('button', { name: /^melee$/i }).first().click();
await p.waitForTimeout(600);
console.log('GEAR melee -> height', await H());
await shot('gear-melee');

// player switch persistence of owned marks
await p.getByRole('button', { name: /^soclopata$/i }).first().click();
await p.waitForTimeout(600);
await shot('gear-soclopata');
console.log('GEAR soclopata header:', await p.evaluate(() => document.body.innerText.slice(0, 300).replace(/\n/g, ' | ')));

// ---------- /capes ----------
await p.goto(BASE + '/capes/', { waitUntil: 'networkidle' });
await p.waitForTimeout(900);
const order = await p.evaluate(() => {
  const sec = [...document.querySelectorAll('h2,h3')].find((h) => /closest capes/i.test(h.textContent));
  if (!sec) return 'no section';
  let n = sec.parentElement;
  while (n && n.querySelectorAll('*').length < 30) n = n.parentElement;
  return [...(n?.children || [])].map((c) => c.innerText?.replace(/\n/g, ' | ').slice(0, 110)).slice(0, 10);
});
console.log('CAPES closest order:', JSON.stringify(order, null, 1));

const more = p.locator('text=/\\+\\d+ more/').first();
console.log('CAPES "+N more" count:', await p.locator('text=/\\+\\d+ more/').count());
if (await more.count()) {
  const tag = await more.evaluate((el) => ({ tag: el.tagName, btn: !!el.closest('button,summary,[role=button]'), cursor: getComputedStyle(el).cursor }));
  console.log('CAPES more element:', JSON.stringify(tag));
  const hBefore = await H();
  await more.click({ force: true }).catch((e) => console.log('CAPES more click failed', e.message));
  await p.waitForTimeout(600);
  console.log('CAPES height', hBefore, '->', await H());
  await shot('capes-more');
}

// ---------- /dungeons ----------
await p.goto(BASE + '/dungeons/', { waitUntil: 'networkidle' });
await p.waitForTimeout(900);
const dcb = p.locator('input[type=checkbox]');
console.log('DUNGEONS checkboxes:', await dcb.count());
if (await dcb.count()) {
  const b0 = await dcb.first().boundingBox().catch(() => null);
  console.log('DUNGEONS cb box:', b0);
  await dcb.first().click({ force: true });
  await p.waitForTimeout(600);
  await p.evaluate(() => window.scrollTo(0, 0));
  await p.waitForTimeout(400);
  await shot('dungeons-checked');
  console.log('DUNGEONS header after check:', await p.evaluate(() => document.body.innerText.slice(0, 300).replace(/\n/g, ' | ')));
}
await p.getByRole('button', { name: /^raids/i }).first().click();
await p.waitForTimeout(600);
await shot('dungeons-raids');
console.log('DUNGEONS raids height', await H());

// player switcher rendering comparison
for (const r of ['/pvm', '/gear', '/dungeons', '/capes']) {
  await p.goto(BASE + r + '/', { waitUntil: 'networkidle' });
  await p.waitForTimeout(700);
  const info = await p.evaluate(() => {
    const btns = [...document.querySelectorAll('button')].filter((b) => /^(Decxus|Soclopata)$/i.test(b.textContent.trim()));
    return btns.map((b) => { const r = b.getBoundingClientRect(); const s = getComputedStyle(b); return { t: b.textContent.trim(), w: Math.round(r.width), h: Math.round(r.height), border: s.borderColor + ' ' + s.borderWidth, bg: s.backgroundColor, radius: s.borderRadius, fs: s.fontSize }; });
  });
  console.log('SWITCHER', r, JSON.stringify(info));
}

await b.close();
