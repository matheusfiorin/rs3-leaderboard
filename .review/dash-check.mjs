import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 360, height: 740 } });
await p.goto('http://localhost:4173/rs3-leaderboard/', { waitUntil: 'networkidle' });
const info = await p.evaluate(() => {
  const h1 = [...document.querySelectorAll('h1')].map(e => e.textContent.trim());
  const h2 = [...document.querySelectorAll('h2')].map(e => ({ t: e.textContent.trim(), y: Math.round(e.getBoundingClientRect().top + scrollY) }));
  return {
    h1, h2,
    scrollW: document.documentElement.scrollWidth,
    innerW: innerWidth,
    hasCombined: document.body.innerText.includes('Combined total'),
    hasScoreline: document.body.innerText.includes('Scoreline'),
    memoriam: document.body.innerText.includes('In Memoriam'),
    buttons: document.querySelectorAll('main button').length,
  };
});
console.log(JSON.stringify(info, null, 2));
await b.close();
