import { chromium } from '@playwright/test';
const b = await chromium.launch();
const p = await b.newPage({ viewport:{width:1920,height:1080} });
for (const r of ['/','/pvm','/goals']) {
  await p.goto('http://localhost:4173/rs3-leaderboard'+r,{waitUntil:'networkidle'}); await p.waitForTimeout(700);
  const t = await p.evaluate(()=> [...document.querySelectorAll('span.truncate')]
    .filter(e=>e.scrollWidth>e.clientWidth+1)
    .map(e=>({txt:e.textContent.slice(0,40), clip:e.scrollWidth-e.clientWidth, w:Math.round(e.getBoundingClientRect().width), parentFree: Math.round(e.closest('div,li,section')?.getBoundingClientRect().width||0)})));
  console.log(r, 'clipped truncate spans:', t.length);
  console.log(JSON.stringify(t.slice(0,10),null,1));
}
await b.close();
