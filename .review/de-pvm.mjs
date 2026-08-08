import { chromium } from '@playwright/test';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.goto('http://localhost:4173/rs3-leaderboard/pvm', { waitUntil: 'networkidle' });
await p.waitForTimeout(500);
console.log(JSON.stringify(await p.evaluate(() => {
  const cards = [...document.querySelectorAll('article,li,div')].filter(e =>
    /Kills/.test(e.innerText) && e.querySelector('input') && e.querySelectorAll('input').length === 1);
  const uniq = cards.filter(c => !cards.some(o => o !== c && o.contains(c)));
  const grid = uniq[0]?.parentElement;
  const cols = grid ? getComputedStyle(grid).gridTemplateColumns : null;
  const sample = uniq.slice(0, 6).map(c => {
    const rb = c.getBoundingClientRect();
    let best = 0, txt='';
    c.querySelectorAll('*').forEach(e => {
      if (e.children.length) return;
      if ((e.className||'').toString().includes('sr-only')) return;
      const t = e.textContent.trim(); if (!t) return;
      const g = e.getBoundingClientRect(); if (!g.width) return;
      if (g.right > best) { best = g.right; txt = t.slice(0,20); }
    });
    return { w: Math.round(rb.width), h: Math.round(rb.height), contentRight: Math.round(best - rb.left), last: txt };
  });
  return { count: uniq.length, cols, sample, pageH: document.body.scrollHeight };
}), null, 1));
// count orphan rows: last card of each tier group
console.log('tier groups:', JSON.stringify(await p.evaluate(() => [...document.querySelectorAll('h3')].map(h=>h.innerText.replace(/\n/g,' ')))));
await b.close();
