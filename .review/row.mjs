import { chromium } from '@playwright/test';
const b = await chromium.launch();
const p = await b.newPage({ viewport:{width:1440,height:900} });
await p.goto('http://localhost:4173/rs3-leaderboard/quests/', { waitUntil:'networkidle' });
await p.waitForTimeout(600);
console.log(await p.evaluate(`(()=>{
  const a=document.querySelector('a[href*="runescape.wiki/w/All_Fired_Up"], a[href*="runescape.wiki"]');
  let row=a; for(let i=0;i<6;i++){ if(row.parentElement && row.parentElement.textContent.includes('QP')===false && row.parentElement.querySelectorAll('a').length<=1) row=row.parentElement; else break; }
  return { rowHTML: row.outerHTML.slice(0,1400), srOnlyInRow: row.querySelectorAll('.sr-only').length,
           table: !!document.querySelector('table'), roleTable: document.querySelectorAll('[role="table"],[role="row"],[role="gridcell"]').length,
           ariaHiddenCount: document.querySelectorAll('[aria-hidden="true"]').length,
           srOnlyTotal: document.querySelectorAll('.sr-only').length };
})()`));
await b.close();
