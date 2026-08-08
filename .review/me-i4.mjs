import { chromium, devices } from '@playwright/test';
import fs from 'node:fs';
const BASE = 'http://localhost:4173/rs3-leaderboard';
const OUT = '/home/mbaraofiorin/dev/rs3-leaderboard/.review/shots/mobile-endgame/interact';
fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1, userAgent: devices['iPhone 13'].userAgent, reducedMotion: 'reduce' });
const p = await ctx.newPage();
p.on('console', (m) => { if (m.type() === 'error') console.log('CONSOLE ERROR:', m.text()); });
const shot = (n) => p.screenshot({ path: `${OUT}/${n}.png` });
const state = () => p.evaluate(() => ({
  h: document.documentElement.scrollHeight,
  kills: document.querySelectorAll('input[aria-label="Kills"]').length,
  cb: document.querySelectorAll('input[type=checkbox]').length,
  sections: [...document.querySelectorAll('h3')].map((x) => x.innerText.replace(/\n/g, ' ')),
  chips: [...document.querySelectorAll('button')].filter((x) => x.innerText.trim().length && x.innerText.trim().length < 14).map((x) => x.innerText.replace(/\s+/g, '') + '=' + getComputedStyle(x).backgroundColor.replace(/\s/g, '')),
}));
const clickBtn = async (txt) => {
  const ok = await p.evaluate((t) => {
    const el = [...document.querySelectorAll('button')].find((b) => b.innerText.replace(/\s+/g, '').toUpperCase().startsWith(t));
    if (!el) return false; el.scrollIntoView({ block: 'center' }); el.click(); return true;
  }, txt);
  await p.waitForTimeout(800);
  console.log(`click ${txt}: ${ok}`);
};

await p.goto(BASE + '/pvm/', { waitUntil: 'networkidle' });
await p.waitForTimeout(1000);
console.log('PVM BASE', JSON.stringify(await state()));
await clickBtn('APEX');
console.log('PVM APEX', JSON.stringify(await state()));
await p.evaluate(() => window.scrollTo(0, 900)); await p.waitForTimeout(400); await shot('pvm-apex');
await clickBtn('ALL');
await clickBtn('GROUP');
console.log('PVM GROUP', JSON.stringify(await state()));
await p.evaluate(() => window.scrollTo(0, 900)); await p.waitForTimeout(400); await shot('pvm-group');
await clickBtn('ANY');
await clickBtn('READYONLY');
console.log('PVM READYONLY', JSON.stringify(await state()));
await p.evaluate(() => window.scrollTo(0, 900)); await p.waitForTimeout(400); await shot('pvm-readyonly');
await clickBtn('READYONLY');
// kills
await p.evaluate(() => { const b = document.querySelector('button[aria-label="Increase"]'); b.scrollIntoView({ block: 'center' }); });
for (let i = 0; i < 3; i++) { await p.evaluate(() => document.querySelector('button[aria-label="Increase"]').click()); await p.waitForTimeout(200); }
await p.waitForTimeout(700);
await p.evaluate(() => window.scrollTo(0, 0)); await p.waitForTimeout(500); await shot('pvm-kills3');
console.log('PVM after kills top:', await p.evaluate(() => document.body.innerText.slice(0, 420).replace(/\n/g, ' | ')));
await p.reload({ waitUntil: 'networkidle' }); await p.waitForTimeout(1000);
console.log('PVM kills persisted:', await p.evaluate(() => document.querySelector('input[aria-label="Kills"]').value));

// gear
await p.goto(BASE + '/gear/', { waitUntil: 'networkidle' }); await p.waitForTimeout(1000);
console.log('GEAR BASE', JSON.stringify(await state()));
const lbl = await p.evaluate(() => { const l = [...document.querySelectorAll('label')].find((e) => /Owned/.test(e.innerText)); const r = l.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height), inner: [...l.children].map((c) => { const q = c.getBoundingClientRect(); return c.tagName + Math.round(q.width) + 'x' + Math.round(q.height); }) }; });
console.log('GEAR Owned label box:', JSON.stringify(lbl));
await p.evaluate(() => { const l = [...document.querySelectorAll('label')].find((e) => /Owned/.test(e.innerText)); l.scrollIntoView({ block: 'center' }); l.click(); });
await p.waitForTimeout(800);
await p.evaluate(() => window.scrollTo(0, 0)); await p.waitForTimeout(500); await shot('gear-owned1');
console.log('GEAR after owned top:', await p.evaluate(() => document.body.innerText.slice(0, 420).replace(/\n/g, ' | ')));
await clickBtn('MELEE');
console.log('GEAR MELEE', JSON.stringify(await state()));
await shot('gear-melee');
console.log('GEAR MELEE top:', await p.evaluate(() => document.body.innerText.slice(0, 300).replace(/\n/g, ' | ')));
await clickBtn('SOCLOPATA');
await shot('gear-soclopata');
console.log('GEAR SOCLO top:', await p.evaluate(() => document.body.innerText.slice(0, 380).replace(/\n/g, ' | ')));

// capes
await p.goto(BASE + '/capes/', { waitUntil: 'networkidle' }); await p.waitForTimeout(1000);
const cl = await p.evaluate(() => {
  const h = [...document.querySelectorAll('h2,h3')].find((x) => /closest capes/i.test(x.innerText));
  const wrap = h.parentElement.parentElement;
  return [...wrap.querySelectorAll(':scope > * > *')].map((c) => c.innerText?.replace(/\n/g, ' ~ ').slice(0, 130)).filter(Boolean).slice(0, 8);
});
console.log('CAPES closest list:', JSON.stringify(cl, null, 1));
const more = await p.evaluate(() => {
  const el = [...document.querySelectorAll('*')].find((e) => e.children.length === 0 && /^\+\d+ more$/.test(e.innerText?.trim() || ''));
  if (!el) return null;
  const before = document.documentElement.scrollHeight;
  el.scrollIntoView({ block: 'center' });
  const info = { tag: el.tagName, inBtn: !!el.closest('button,summary,[role=button],a'), cursor: getComputedStyle(el).cursor, text: el.innerText.trim() };
  el.click();
  return { ...info, before };
});
console.log('CAPES +N more:', JSON.stringify(more));
await p.waitForTimeout(700);
console.log('CAPES h after more click:', await p.evaluate(() => document.documentElement.scrollHeight));
await shot('capes-more');
await clickBtn('MILESTONE');
console.log('CAPES MILESTONE', JSON.stringify(await state()));
await p.evaluate(() => window.scrollTo(0, 400)); await p.waitForTimeout(400); await shot('capes-milestone');

// dungeons
await p.goto(BASE + '/dungeons/', { waitUntil: 'networkidle' }); await p.waitForTimeout(1000);
console.log('DUN BASE', JSON.stringify(await state()));
const dlbl = await p.evaluate(() => { const l = document.querySelector('label'); const r = l.getBoundingClientRect(); return { t: l.innerText.replace(/\n/g, ' ').slice(0, 50), w: Math.round(r.width), h: Math.round(r.height) }; });
console.log('DUN label:', JSON.stringify(dlbl));
await p.evaluate(() => { const l = document.querySelector('label'); l.scrollIntoView({ block: 'center' }); l.click(); });
await p.waitForTimeout(800);
await p.evaluate(() => window.scrollTo(0, 0)); await p.waitForTimeout(500); await shot('dungeons-checked');
console.log('DUN after check top:', await p.evaluate(() => document.body.innerText.slice(0, 420).replace(/\n/g, ' | ')));
await clickBtn('RAIDS');
console.log('DUN RAIDS', JSON.stringify(await state()));
await p.evaluate(() => window.scrollTo(0, 500)); await p.waitForTimeout(400); await shot('dungeons-raids');
await b.close();
