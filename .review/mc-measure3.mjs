import { chromium } from '@playwright/test';
const b = await chromium.launch();
const p = await (await b.newContext({viewport:{width:390,height:844}})).newPage();
await p.goto('http://localhost:4173/rs3-leaderboard/quests',{waitUntil:'networkidle'}); await p.waitForTimeout(1000);
console.log(await p.evaluate(()=>{
  const m={};
  document.querySelectorAll('span[role="img"]').forEach(s=>{
    const cs=getComputedStyle(s);
    const k=(s.getAttribute('aria-label')||'')+' | '+cs.color+' | border '+cs.borderColor;
    m[k]=(m[k]||0)+1;
  });
  return m;
}));
console.log('legend text', await p.evaluate(()=>{
  const el=[...document.querySelectorAll('div')].find(d=>/^\d+ quests/.test(d.innerText||''));
  return el? el.innerText.replace(/\n/g,' | '):null;
}));
await b.close();
