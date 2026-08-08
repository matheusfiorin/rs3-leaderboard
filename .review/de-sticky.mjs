import { chromium } from '@playwright/test';
const OUT='/home/mbaraofiorin/dev/rs3-leaderboard/.review/shots/desktop-endgame';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
for (const r of ['/pvm','/dungeons']) {
  await p.goto('http://localhost:4173/rs3-leaderboard'+r, { waitUntil: 'networkidle' });
  await p.waitForTimeout(400);
  const info = await p.evaluate(() => {
    const btn = [...document.querySelectorAll('button')].find(x => /^ALL/.test(x.innerText));
    let n = btn, chain = [];
    while (n && n !== document.body) { const s = getComputedStyle(n); chain.push(s.position); n = n.parentElement; }
    return { filterPositions: chain.slice(0,5) };
  });
  console.log(r, JSON.stringify(info));
  await p.evaluate(() => window.scrollTo(0, 3500));
  await p.waitForTimeout(500);
  await p.screenshot({ path: OUT + '/int-scrolled-' + r.slice(1) + '.png' });
}
await b.close();
