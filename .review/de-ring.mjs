import { chromium } from '@playwright/test';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.goto('http://localhost:4173/rs3-leaderboard/capes', { waitUntil: 'networkidle' });
await p.waitForTimeout(500);
console.log(JSON.stringify(await p.evaluate(() => {
  const out = [];
  document.querySelectorAll('svg').forEach(svg => {
    const wrap = svg.parentElement?.parentElement;
    const label = wrap?.innerText?.replace(/\n/g, ' ');
    if (!label || !/\/99/.test(label)) return;
    const arcs = [...svg.querySelectorAll('circle')].map(c => ({
      da: getComputedStyle(c).strokeDasharray, do: getComputedStyle(c).strokeDashoffset,
      sw: getComputedStyle(c).strokeWidth, col: getComputedStyle(c).stroke }));
    out.push({ label: label.slice(0, 24), svgW: Math.round(svg.getBoundingClientRect().width), arcs });
  });
  return out.slice(0, 5);
}), null, 1));
await b.close();
