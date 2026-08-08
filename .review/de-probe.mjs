import { chromium } from '@playwright/test';
const BASE = 'http://localhost:4173/rs3-leaderboard';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });

for (const route of ['/pvm', '/dungeons', '/gear', '/capes']) {
  await p.goto(BASE + route, { waitUntil: 'networkidle' });
  await p.waitForTimeout(500);
  const t = await p.evaluate(() => {
    const out = [];
    document.querySelectorAll('*').forEach(el => {
      if (el.children.length) return;
      const s = getComputedStyle(el);
      if (el.scrollWidth > el.clientWidth + 1 && (s.textOverflow === 'ellipsis' || s.overflow !== 'visible')) {
        const r = el.getBoundingClientRect();
        out.push({
          text: el.textContent.trim().slice(0, 60),
          clientW: el.clientWidth, scrollW: el.scrollWidth,
          maxW: s.maxWidth, w: Math.round(r.width),
          cls: (el.className || '').toString().slice(0, 90),
          parentCls: (el.parentElement?.className || '').toString().slice(0, 90),
        });
      }
    });
    return out;
  });
  console.log('=== ' + route + ' truncated: ' + t.length);
  t.slice(0, 8).forEach(x => console.log('   ', JSON.stringify(x)));
}
await b.close();
