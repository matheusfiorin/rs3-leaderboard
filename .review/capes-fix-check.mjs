// Capes page: probe for the three reviewed defects.
// Run against the pre-change build to see the defects; run again after a rebuild
// to see them gone.
//   node .review/capes-fix-check.mjs
import { chromium } from '@playwright/test';

const URL = 'http://localhost:4173/rs3-leaderboard/capes';
const b = await chromium.launch();

// --- desktop -----------------------------------------------------------------
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.goto(URL, { waitUntil: 'networkidle' });
await p.waitForTimeout(800);

const report = await p.evaluate(() => {
  const head = [...document.querySelectorAll('h3')].find((h) =>
    /closest capes/i.test(h.textContent || ''),
  );
  const section = head?.closest('section');
  const grid = section?.querySelector('div.grid');
  const cards = [...(grid?.children ?? [])];

  const closest = cards.map((c) => ({
    text: (c.textContent || '').replace(/\s+/g, ' ').slice(0, 90),
    h: Math.round(c.getBoundingClientRect().height),
    // how much of the card is empty below its last child
    slack: (() => {
      const box = c.getBoundingClientRect();
      const inner = [...c.querySelectorAll('*')].reduce(
        (m, e) => Math.max(m, e.getBoundingClientRect().bottom),
        box.top,
      );
      return Math.round(box.bottom - inner);
    })(),
  }));

  // Skill grid: compare the arc the ring draws with the level pair it encircles.
  const rings = [];
  for (const a of document.querySelectorAll('a[aria-label]')) {
    const m = (a.textContent || '').match(/(\d+)\s*\/\s*(\d+)/);
    const arc = a.querySelector('svg circle:nth-child(2)');
    if (!m || !arc) continue;
    const cs = getComputedStyle(arc);
    const circ = parseFloat(cs.strokeDasharray);
    const off = parseFloat(cs.strokeDashoffset);
    rings.push({
      pair: `${m[1]}/${m[2]}`,
      arcPct: +(((circ - off) / circ) * 100).toFixed(1),
      levelPct: +((+m[1] / +m[2]) * 100).toFixed(1),
    });
    if (rings.length >= 6) break;
  }

  return {
    h1: [...document.querySelectorAll('h1')].map((h) => h.textContent?.trim()),
    closestHint: head?.parentElement?.querySelector('p')?.textContent?.trim(),
    gridCols: grid ? getComputedStyle(grid).gridTemplateColumns.split(' ').length : 0,
    gridAlign: grid ? getComputedStyle(grid).alignItems : null,
    closest,
    rings,
  };
});

console.log('h1:', report.h1);
console.log('closest hint:', report.closestHint);
console.log('closest grid cols:', report.gridCols, 'align-items:', report.gridAlign);
console.log('closest order:');
for (const c of report.closest) console.log(`  h=${c.h} slack=${c.slack}  ${c.text}`);
console.log('ring arc vs printed level pair:');
for (const r of report.rings)
  console.log(`  ${r.pair}  arc=${r.arcPct}%  level=${r.levelPct}%`);

// --- 360px: no horizontal page scroll ---------------------------------------
const m = await b.newPage({ viewport: { width: 360, height: 780 } });
await m.goto(URL, { waitUntil: 'networkidle' });
await m.waitForTimeout(600);
console.log(
  'mobile 360 overflow:',
  await m.evaluate(() => ({
    scrollW: document.documentElement.scrollWidth,
    clientW: document.documentElement.clientWidth,
  })),
);

await b.close();
