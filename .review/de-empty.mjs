import { chromium } from '@playwright/test';
const BASE = 'http://localhost:4173/rs3-leaderboard';
const OUT = '/home/mbaraofiorin/dev/rs3-leaderboard/.review/shots/desktop-endgame';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
const btn = (t) => p.locator('button').filter({ hasText: new RegExp('^' + t, 'i') }).first();
await p.goto(BASE + '/pvm', { waitUntil: 'networkidle' }); await p.waitForTimeout(400);
await btn('APEX').click(); await btn('SOLO').click(); await btn('READY ONLY').click();
await p.waitForTimeout(500);
await p.screenshot({ path: OUT + '/int-pvm-empty2.png', clip: { x: 240, y: 520, width: 1200, height: 380 }, fullPage: true });
const box = await p.evaluate(() => {
  const el = [...document.querySelectorAll('*')].find(e => e.children.length === 0 && /Nothing matches/.test(e.textContent));
  const c = el.closest('div');
  const r = c.getBoundingClientRect();
  return { text: c.innerText, h: Math.round(r.height), w: Math.round(r.width), btns: [...c.querySelectorAll('button,a')].map(x => x.innerText) };
});
console.log(JSON.stringify(box));

// gear: what changes between styles
await p.goto(BASE + '/gear', { waitUntil: 'networkidle' }); await p.waitForTimeout(400);
for (const s of ['MELEE', 'RANGED', 'MAGIC', 'NECRO']) {
  await p.locator('button').filter({ hasText: new RegExp('^' + s + '$', 'i') }).first().click();
  await p.waitForTimeout(400);
  const info = await p.evaluate(() => {
    const main = document.querySelector('main') || document.body;
    const t = main.innerText.replace(/\n+/g, ' | ');
    return {
      sub: t.slice(0, 160),
      firstUpgrade: [...document.querySelectorAll('h3,h4,strong,a')].map(e=>e.innerText).filter(Boolean).slice(0,4),
      height: document.body.scrollHeight,
    };
  });
  console.log(s, JSON.stringify(info));
}
await p.locator('button').filter({ hasText: /^MELEE$/i }).first().click(); await p.waitForTimeout(500);
await p.screenshot({ path: OUT + '/int-gear-melee.png', clip: { x: 240, y: 0, width: 1200, height: 900 }, fullPage: true });

// capes closest-card dead space measurement
await p.goto(BASE + '/capes', { waitUntil: 'networkidle' }); await p.waitForTimeout(400);
const m = await p.evaluate(() => {
  const h = [...document.querySelectorAll('h3')].find(x => /Closest capes/i.test(x.textContent));
  const grid = h.parentElement.nextElementSibling || h.closest('section')?.querySelector('div');
  const kids = [...(grid?.children || [])].map(k => {
    const r = k.getBoundingClientRect();
    const last = k.lastElementChild?.getBoundingClientRect();
    return { h: Math.round(r.height), contentBottom: last ? Math.round(last.bottom - r.top) : null, txt: k.innerText.split('\n')[1] };
  });
  return kids;
});
console.log('closest capes cards:', JSON.stringify(m));
await b.close();
