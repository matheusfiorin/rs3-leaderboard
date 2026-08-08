import { chromium } from '@playwright/test';
const b = await chromium.launch();
const p = await b.newPage({ viewport:{width:1920,height:1080} });
// money hero
await p.goto('http://localhost:4173/rs3-leaderboard/money',{waitUntil:'networkidle'}); await p.waitForTimeout(700);
console.log('MONEY hero:', await p.evaluate(()=>{
  const h=[...document.querySelectorAll('*')].filter(e=>e.children.length===0&&/^Craft nature runes/.test(e.textContent.trim()))[0];
  let card=h; while(card && !/rounded/.test(card.className||'')) card=card.parentElement;
  const cr=card.getBoundingClientRect();
  let maxR=0; card.querySelectorAll('*').forEach(e=>{const r=e.getBoundingClientRect(); if(r.width>0&&e.children.length===0) maxR=Math.max(maxR,r.right);});
  return {cardW:Math.round(cr.width), cardRight:Math.round(cr.right), contentRight:Math.round(maxR), voidPx:Math.round(cr.right-maxR), cardH:Math.round(cr.height)};
}));
// goals hero
await p.goto('http://localhost:4173/rs3-leaderboard/goals',{waitUntil:'networkidle'}); await p.waitForTimeout(700);
console.log('GOALS hero:', await p.evaluate(()=>{
  const h=[...document.querySelectorAll('h3')].find(e=>/Base 50/.test(e.textContent));
  const card=h.closest('div[class*="rounded"]');
  const cr=card.getBoundingClientRect();
  let maxR=0; card.querySelectorAll('*').forEach(e=>{const r=e.getBoundingClientRect(); if(r.width>0&&e.children.length===0) maxR=Math.max(maxR,r.right);});
  return {cardW:Math.round(cr.width), cardRight:Math.round(cr.right), contentRight:Math.round(maxR), voidPx:Math.round(cr.right-maxR)};
}));
// goals early section empty column
console.log('GOALS grid rows:', await p.evaluate(()=>{
  return [...document.querySelectorAll('section')].map(s=>{
    const g=s.querySelector('div[class*="grid"]'); if(!g) return null;
    const kids=[...g.children];
    return {head:s.querySelector('h3')?.innerText.replace(/\n/g,' '), cards:kids.length, gridW:Math.round(g.getBoundingClientRect().width)};
  }).filter(Boolean);
}));
// skills method rows gap
await p.goto('http://localhost:4173/rs3-leaderboard/skills',{waitUntil:'networkidle'}); await p.waitForTimeout(700);
await p.locator('li button').first().click(); await p.waitForTimeout(500);
console.log('SKILLS method row gap:', await p.evaluate(()=>{
  const a=[...document.querySelectorAll('a')].find(e=>/Waterfiends/.test(e.textContent));
  if(!a) return 'n/a';
  const row=a.closest('div[class*="flex"]')?.parentElement;
  const num=[...row.querySelectorAll('*')].filter(e=>e.children.length===0&&/^\d+K?$/.test(e.textContent.trim()))[0];
  return {nameRight:Math.round(a.getBoundingClientRect().right), numLeft: num?Math.round(num.getBoundingClientRect().left):null, rowW:Math.round(row.getBoundingClientRect().width)};
}));
// pvm CountInput gap
await p.goto('http://localhost:4173/rs3-leaderboard/pvm',{waitUntil:'networkidle'}); await p.waitForTimeout(700);
console.log('PVM Kills row:', await p.evaluate(()=>{
  const s=[...document.querySelectorAll('span')].find(e=>e.textContent.trim()==='Kills');
  const row=s.parentElement; const r=row.getBoundingClientRect();
  const dec=row.querySelector('button');
  return {rowW:Math.round(r.width), labelRight:Math.round(s.getBoundingClientRect().right), firstBtnLeft:Math.round(dec.getBoundingClientRect().left)};
}));
await b.close();
