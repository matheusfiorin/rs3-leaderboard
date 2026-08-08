import { chromium } from '@playwright/test';
const b = await chromium.launch();
const p = await b.newPage({ viewport:{width:1440,height:900} });
await p.goto('http://localhost:4173/rs3-leaderboard/quests/', { waitUntil:'networkidle' });
await p.waitForTimeout(600);
console.log(await p.evaluate(`(()=>{
  const spans=Array.from(document.querySelectorAll('span[title="Decxus"]'));
  const s=spans[0]; let row=s.parentElement; while(row && row.querySelectorAll('a').length===0) row=row.parentElement;
  const header=Array.from(document.querySelectorAll('*')).find(e=>e.textContent.trim().startsWith('Quest')&&e.textContent.includes('Diff')&&e.children.length>2);
  return { rowHTML: row.outerHTML.replace(/\\s+/g,' ').slice(0,1100),
           headerHTML: header? header.outerHTML.replace(/\\s+/g,' ').slice(0,700):'none',
           doneVsNot: spans.slice(0,6).map(x=>({txt:x.textContent.trim(), color:getComputedStyle(x).color, cls:x.className.toString()})) };
})()`));
await b.close();
