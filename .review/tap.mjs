import { chromium } from '@playwright/test';
const b = await chromium.launch();
const ctx = await b.newContext({viewport:{width:390,height:844}, deviceScaleFactor:2, isMobile:true, hasTouch:true});
const p = await ctx.newPage();
await p.goto('http://localhost:4173/rs3-leaderboard/money',{waitUntil:'domcontentloaded'}); await p.waitForTimeout(1000);
const r = await p.evaluate(()=>{
  return [...document.querySelectorAll('button')].map(bt=>{
    const rc=bt.getBoundingClientRect(); const par=bt.parentElement.getBoundingClientRect();
    return {t:bt.textContent.trim().slice(0,14), w:Math.round(rc.width), h:Math.round(rc.height), parentH:Math.round(par.height)};
  }).filter(x=>x.h<40).slice(0,20);
});
console.log(JSON.stringify(r));
// gap between adjacent chips
const gaps = await p.evaluate(()=>{
  const bs=[...document.querySelectorAll('button')].filter(b=>/^(All|Proc|Gather|Combat|AFK|Daily)$/.test(b.textContent.trim()));
  const out=[]; for(let i=1;i<bs.length;i++){const a=bs[i-1].getBoundingClientRect(),c=bs[i].getBoundingClientRect(); out.push(Math.round(c.left-a.right));}
  return out;
});
console.log('chip gaps px:', JSON.stringify(gaps));
await b.close();
