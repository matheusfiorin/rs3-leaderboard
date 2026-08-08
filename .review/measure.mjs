import { chromium } from '@playwright/test';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
for (const route of ['/', '/skills', '/pvm', '/money', '/goals']) {
  await p.goto('http://localhost:4173/rs3-leaderboard' + route, { waitUntil: 'networkidle' });
  await p.waitForTimeout(600);
  const info = await p.evaluate(() => {
    const out = [];
    // find widest-ish containers
    const seen = new Set();
    document.querySelectorAll('body *').forEach(el => {
      const r = el.getBoundingClientRect();
      if (r.width < 200 || r.height < 40) return;
      const cs = getComputedStyle(el);
      const key = `${Math.round(r.x)}|${Math.round(r.width)}|${el.tagName}`;
      if (seen.has(key)) return;
      seen.add(key);
      out.push({
        tag: el.tagName.toLowerCase(),
        cls: (el.className || '').toString().slice(0, 90),
        x: Math.round(r.x), w: Math.round(r.width), h: Math.round(r.height),
        maxW: cs.maxWidth, display: cs.display, grid: cs.gridTemplateColumns,
      });
    });
    return out.filter(o => o.w > 900).slice(0, 30);
  });
  console.log('=== ' + route);
  for (const i of info) console.log(`${i.tag}.${i.cls}  x=${i.x} w=${i.w} h=${i.h} maxW=${i.maxW} grid=${i.grid}`);
}
await b.close();
