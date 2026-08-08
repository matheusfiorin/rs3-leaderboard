import { chromium } from '@playwright/test';
const b = await chromium.launch();
const p = await b.newPage({ viewport:{width:1440,height:900} });
await p.goto('http://localhost:4173/rs3-leaderboard/',{waitUntil:'networkidle'});
await p.waitForTimeout(1500);
const m = await p.evaluate(()=>{
  const out={};
  const h2 = [...document.querySelectorAll('h2')].find(h=>/Tonight/.test(h.textContent));
  const sec = h2.closest('div').parentElement;
  const grid = [...sec.querySelectorAll('div')].find(d=>getComputedStyle(d).display==='grid');
  out.tonightCols = grid ? [...grid.children].map(c=>{const r=c.getBoundingClientRect(); return {w:Math.round(r.width),h:Math.round(r.height)};}) : null;
  // hero card
  const hero = [...document.querySelectorAll('*')].find(e=>e.textContent.trim()==='1.92B');
  const hr = hero.getBoundingClientRect();
  out.heroNum = {left:Math.round(hr.left), right:Math.round(hr.right), w:Math.round(hr.width)};
  out.heroCard = (()=>{const c=hero.closest('div[class*="rounded"]'); const r=c.getBoundingClientRect(); return {w:Math.round(r.width),h:Math.round(r.height)};})();
  // ticker row
  const tick = [...document.querySelectorAll('*')].find(e=>e.textContent.trim()==='Levelled up Necromancy.'&&e.children.length===0);
  const li = tick.closest('li')||tick.parentElement.parentElement;
  const lr=li.getBoundingClientRect();
  out.tickerRow={w:Math.round(lr.width),h:Math.round(lr.height)};
  const txt=tick.getBoundingClientRect();
  out.tickerTextRight=Math.round(txt.right - lr.left);
  return out;
});
console.log(JSON.stringify(m,null,1));
await b.close();
