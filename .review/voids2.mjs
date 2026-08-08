import { chromium } from '@playwright/test';
const b = await chromium.launch();
const p = await b.newPage({ viewport:{width:1920,height:1080} });
const q = (r)=>p.goto('http://localhost:4173/rs3-leaderboard'+r,{waitUntil:'networkidle'}).then(()=>p.waitForTimeout(700));

await q('/goals');
console.log('GOALS grids:', await p.evaluate(()=>[...document.querySelectorAll('section')].map(s=>{
  const g=[...s.children].find(c=>/grid/.test(c.className||''));
  if(!g) return null;
  const gr=g.getBoundingClientRect();
  const kids=[...g.children].map(c=>{const r=c.getBoundingClientRect();return {x:Math.round(r.x),w:Math.round(r.width),h:Math.round(r.height)};});
  return {head:(s.querySelector('h3')||{}).innerText?.replace(/\n/g,' '), gridW:Math.round(gr.width), n:kids.length, kids};
}).filter(Boolean)));

await q('/skills');
await p.locator('li button').first().click(); await p.waitForTimeout(600);
console.log('SKILLS method gap:', await p.evaluate(()=>{
  const a=[...document.querySelectorAll('a')].find(e=>/Waterfiends/.test(e.textContent));
  const nums=[...document.querySelectorAll('*')].filter(e=>e.children.length===0&&e.textContent.trim()==='110K');
  return {nameRight:Math.round(a.getBoundingClientRect().right), numLeft:nums.length?Math.round(nums[0].getBoundingClientRect().left):null};
}));

await q('/pvm');
console.log('PVM Kills row:', await p.evaluate(()=>{
  const s=[...document.querySelectorAll('span')].find(e=>e.textContent.trim()==='Kills');
  const row=s.parentElement, r=row.getBoundingClientRect(), btn=row.querySelector('button');
  return {rowW:Math.round(r.width), labelRight:Math.round(s.getBoundingClientRect().right), firstBtnLeft:Math.round(btn.getBoundingClientRect().left)};
}));
console.log('PVM tier grids:', await p.evaluate(()=>[...document.querySelectorAll('section')].map(s=>{
  const g=[...s.children].find(c=>/grid/.test(c.className||''));
  if(!g) return null;
  return {head:(s.querySelector('h3')||{}).innerText?.replace(/\n/g,' '), gridW:Math.round(g.getBoundingClientRect().width), n:g.children.length, cardW:Math.round(g.children[0].getBoundingClientRect().width)};
}).filter(Boolean)));

await q('/money');
console.log('MONEY grid:', await p.evaluate(()=>{
  const grids=[...document.querySelectorAll('div')].filter(d=>/grid/.test(d.className||'')&&d.children.length>4);
  return grids.map(g=>({n:g.children.length, w:Math.round(g.getBoundingClientRect().width), cardW:Math.round(g.children[0].getBoundingClientRect().width), cls:(g.className||'').slice(0,60)}));
}));
await b.close();
