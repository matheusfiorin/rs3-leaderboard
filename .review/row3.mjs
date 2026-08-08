import { chromium } from '@playwright/test';
const b = await chromium.launch();
const p = await b.newPage({ viewport:{width:1440,height:900} });
await p.goto('http://localhost:4173/rs3-leaderboard/quests/', { waitUntil:'networkidle' });
await p.waitForTimeout(600);
console.log(await p.evaluate(`(()=>{
  const li=document.querySelectorAll('ul > li')[3];
  return { full: li.outerHTML.replace(/\\s+/g,' ').slice(400,1600) };
})()`));
await b.close();
