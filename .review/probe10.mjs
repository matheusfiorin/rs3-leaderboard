import { chromium } from '@playwright/test';
const b = await chromium.launch();
const p = await b.newPage({ viewport:{width:1440,height:900} });
await p.goto('http://localhost:4173/rs3-leaderboard/quests',{waitUntil:'networkidle'});
await p.waitForTimeout(1200);
const s = await p.evaluate(()=>{
  const aside=document.querySelector('aside')||[...document.querySelectorAll('nav')].map(n=>n.closest('div'))[0];
  const cs=aside?getComputedStyle(aside):null;
  const inner = aside? [...aside.querySelectorAll('div')].map(d=>({pos:getComputedStyle(d).position, top:getComputedStyle(d).top, h:Math.round(d.getBoundingClientRect().height)})).slice(0,4):null;
  return {tag:aside?.tagName, pos:cs?.position, top:cs?.top, w:aside?Math.round(aside.getBoundingClientRect().width):null, inner};
});
console.log('sidebar', JSON.stringify(s));
await p.evaluate(()=>window.scrollTo(0,15000));
await p.waitForTimeout(500);
await p.screenshot({path:'.review/shots/desktop-core/quests-deep-scroll.png'});
// row void measurement
const void_ = await p.evaluate(()=>{
  const lis=[...document.querySelectorAll('li')].filter(l=>getComputedStyle(l).display==='grid');
  const li=lis[10]; const lr=li.getBoundingClientRect();
  const kids=[...li.children].map(c=>{const r=c.getBoundingClientRect(); return {t:c.textContent.trim().slice(0,24), left:Math.round(r.left-lr.left), w:Math.round(r.width)};});
  return {rowW:Math.round(lr.width), kids, cols:getComputedStyle(li).gridTemplateColumns};
});
console.log('quest row', JSON.stringify(void_,null,1));
await b.close();
