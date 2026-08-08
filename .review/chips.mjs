import { chromium } from '@playwright/test';
const b = await chromium.launch();
const p = await b.newPage({ viewport:{width:1440,height:900} });
await p.goto('http://localhost:4173/rs3-leaderboard/skills/', { waitUntil:'networkidle' });
await p.waitForTimeout(500);
console.log(await p.evaluate(`(()=>{
  const g=document.querySelector('[aria-label="Filter by skill category"]');
  return { group: g.outerHTML.replace(/\\s+/g,' ').slice(0,420), role:g.getAttribute('role') };
})()`));
console.log('money chip for comparison:');
await p.goto('http://localhost:4173/rs3-leaderboard/money/', { waitUntil:'networkidle' });
await p.waitForTimeout(500);
console.log(await p.evaluate(`document.querySelector('[aria-label="Category"]').outerHTML.replace(/\\s+/g,' ').slice(0,340)`));
await b.close();
