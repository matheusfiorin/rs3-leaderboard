import { chromium } from '@playwright/test';
const b = await chromium.launch();
const p = await b.newPage({ viewport:{width:1440,height:900} });
await p.goto('http://localhost:4173/rs3-leaderboard/goals',{waitUntil:'networkidle'});
await p.waitForTimeout(1200);
const found = await p.evaluate(()=>{
  const el=[...document.querySelectorAll('*')].find(x=>/remaining/i.test(x.textContent||'')&&x.children.length<=2&&x.tagName!=='BODY');
  return el?{tag:el.tagName, txt:el.textContent.trim().slice(0,40)}:null;
});
console.log(JSON.stringify(found));
const sums = await p.evaluate(()=>[...document.querySelectorAll('summary')].map(s=>s.textContent.trim().slice(0,30)));
console.log('summaries', JSON.stringify(sums));
await p.evaluate(()=>{const s=[...document.querySelectorAll('summary')].find(x=>/remaining/i.test(x.textContent)); s.scrollIntoView({block:'center'}); s.click();});
await p.waitForTimeout(700);
await p.screenshot({path:'.review/shots/desktop-core/goals-expanded.png'});
await b.close();
