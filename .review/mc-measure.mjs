import { chromium } from '@playwright/test';
const B='http://localhost:4173/rs3-leaderboard';
const b = await chromium.launch();
const p = await (await b.newContext({viewport:{width:390,height:844}})).newPage();
await p.goto(B+'/',{waitUntil:'networkidle'}); await p.waitForTimeout(900);
console.log(await p.evaluate(()=>{
  const out=[];
  document.querySelectorAll('span.truncate').forEach(s=>{
    const clipped = s.scrollWidth > s.clientWidth+1;
    if(!clipped) return;
    const parent = s.closest('span[class*="inline-flex"]') || s.parentElement;
    const container = parent.parentElement;
    out.push({txt:s.textContent.trim().slice(0,40), need:s.scrollWidth, have:s.clientWidth, chipW:Math.round(parent.getBoundingClientRect().width), containerW:Math.round(container.getBoundingClientRect().width), title:parent.getAttribute('title')});
  });
  return out;
}));
// home: activity ticker redundancy
console.log('ticker rows', await p.evaluate(()=>{
  const t=document.body.innerText;
  return (t.match(/Levelled up \w+\./g)||[]).length;
}));
await b.close();
