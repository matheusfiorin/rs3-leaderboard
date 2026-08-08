import { chromium } from '@playwright/test';
const BASE = 'http://localhost:4173/rs3-leaderboard';
const OUT = '/home/mbaraofiorin/dev/rs3-leaderboard/.review/shots/desktop-endgame';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });

const rightmost = () => `(() => {
  const vis = (e) => { const s = getComputedStyle(e); return s.position !== 'absolute' || !e.className.includes('sr-only'); };
})()`;

await p.goto(BASE + '/gear', { waitUntil: 'networkidle' }); await p.waitForTimeout(500);
console.log('GEAR rows:', JSON.stringify(await p.evaluate(() => {
  const rows = [...document.querySelectorAll('li,article')].filter(e => /STILL GATED ON/.test(e.innerText)).slice(0, 4);
  return rows.map(r => {
    const rb = r.getBoundingClientRect();
    let best = 0, bestTxt = '';
    r.querySelectorAll('*').forEach(e => {
      if (e.children.length) return;
      if ((e.className || '').toString().includes('sr-only')) return;
      const t = e.textContent.trim(); if (!t) return;
      const g = e.getBoundingClientRect();
      if (!g.width || g.width > 900) return;
      if (g.right > rb.right - 120) return; // exclude the ring cluster
      if (g.right > best) { best = g.right; bestTxt = t.slice(0, 24); }
    });
    const ring = [...r.querySelectorAll('svg')].map(s => s.getBoundingClientRect()).filter(g => g.left > rb.right - 140)[0];
    return { card: [Math.round(rb.left), Math.round(rb.right)], contentRight: Math.round(best), last: bestTxt,
      ringLeft: ring ? Math.round(ring.left) : null, deadPx: ring ? Math.round(ring.left - best) : null };
  });
}), null, 1));

// capes skill badge rings: arc length for min and max level
await p.goto(BASE + '/capes', { waitUntil: 'networkidle' }); await p.waitForTimeout(500);
console.log('SKILL badges:', JSON.stringify(await p.evaluate(() => {
  const out = [];
  document.querySelectorAll('svg circle, svg path').forEach(el => {
    const p = el.closest('div');
    const box = el.getBoundingClientRect();
    if (box.width > 60 || box.width < 10) return;
    const label = p?.parentElement?.innerText?.replace(/\n/g, ' ');
    if (!label || !/\/99/.test(label)) return;
    const dash = getComputedStyle(el).strokeDasharray;
    out.push({ label: label.slice(0, 22), ringPx: Math.round(box.width), dash });
  });
  return out.slice(0, 6);
}), null, 1));

await p.screenshot({ path: OUT + '/int-capes-skillgrid.png', clip: { x: 250, y: 700, width: 1170, height: 260 }, fullPage: true });
await p.screenshot({ path: OUT + '/int-capes-closest.png', clip: { x: 250, y: 400, width: 1170, height: 240 }, fullPage: true });
await b.close();
