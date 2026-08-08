import { chromium } from '@playwright/test';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width:1440, height:900 } });
await p.goto('http://localhost:4173/rs3-leaderboard/quests', { waitUntil:'networkidle' });
await p.waitForTimeout(1200);
await p.evaluate(()=>window.scrollTo(0,1000));
await p.waitForTimeout(400);
await p.screenshot({ path:'.review/shots/desktop-core/quests-list.png' });
// row geometry
const g = await p.evaluate(()=>{
  const li = document.querySelectorAll('ul li');
  const r0 = li[0].getBoundingClientRect();
  return { rows: li.length, rowW: Math.round(r0.width), rowH: Math.round(r0.height), cs: getComputedStyle(li[0]).gridTemplateColumns };
});
console.log('quest list', JSON.stringify(g));
// search test
await p.evaluate(()=>window.scrollTo(0,820));
await p.fill('input[placeholder="Search quests..."]','dragon');
await p.waitForTimeout(600);
const after = await p.evaluate(()=>({ h: document.documentElement.scrollHeight, rows: document.querySelectorAll('ul li').length }));
console.log('after search', JSON.stringify(after));
await p.screenshot({ path:'.review/shots/desktop-core/quests-search.png' });
await b.close();
