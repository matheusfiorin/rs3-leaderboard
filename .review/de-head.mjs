import { chromium } from '@playwright/test';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.goto('http://localhost:4173/rs3-leaderboard/pvm', { waitUntil: 'networkidle' });
await p.waitForTimeout(400);
console.log(JSON.stringify(await p.evaluate(() => {
  return [...document.querySelectorAll('h2,h3')].map(h => {
    const s = getComputedStyle(h);
    const r = h.getBoundingClientRect();
    const par = h.parentElement; const ps = getComputedStyle(par);
    return { txt: h.innerText.replace(/\n/g,' ').slice(0,26), tag: h.tagName, fs: s.fontSize, fw: s.fontWeight,
      color: s.color, h: Math.round(r.height), sticky: ps.position, parentBorder: ps.borderTopWidth + ' ' + ps.borderBottomWidth };
  });
}), null, 1));
await b.close();
