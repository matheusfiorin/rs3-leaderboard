import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.goto('http://localhost:4173/rs3-leaderboard/', { waitUntil: 'networkidle' });
console.log(JSON.stringify(await p.evaluate(() => {
  const arch = [...document.querySelectorAll('a[href*="/archive"]')].map(a => ({
    txt: a.textContent.trim().slice(0,40), inNav: !!a.closest('nav'), inMain: !!a.closest('main'),
  }));
  const h2 = [...document.querySelectorAll('main h2')].find(h => /Tonight/.test(h.textContent));
  const sec = h2?.closest('section');
  const grid = sec?.querySelector(':scope > div');
  const kids = grid ? [...grid.children].map(c => ({ cls: c.className.slice(0,40), h: Math.round(c.getBoundingClientRect().height) })) : [];
  return { arch, gridCls: grid?.className, kids };
}), null, 2));
await b.close();
