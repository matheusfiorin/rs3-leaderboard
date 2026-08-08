import { chromium } from '@playwright/test';
const b = await chromium.launch();
const p = await b.newPage({ viewport:{width:1440,height:900} });
await p.goto('http://localhost:4173/rs3-leaderboard/',{waitUntil:'networkidle'});
await p.waitForTimeout(1500);
const m = await p.evaluate(()=>{
  const grids=[...document.querySelectorAll('div')].filter(d=>getComputedStyle(d).display==='grid');
  return grids.map(g=>{const r=g.getBoundingClientRect(); return {cols:getComputedStyle(g).gridTemplateColumns, w:Math.round(r.width), h:Math.round(r.height), kids:[...g.children].map(c=>{const cr=c.getBoundingClientRect(); return Math.round(cr.width)+'x'+Math.round(cr.height);})};});
});
console.log(JSON.stringify(m,null,1));
await b.close();
