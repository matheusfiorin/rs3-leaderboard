import { chromium } from '@playwright/test';
const b = await chromium.launch();
const p = await b.newPage({ viewport:{width:1440,height:900} });
const errs=[]; p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
await p.goto('http://localhost:4173/rs3-leaderboard/skills',{waitUntil:'networkidle'});
await p.waitForTimeout(1200);
const btns = await p.evaluate(()=>[...document.querySelectorAll('button')].map(b=>b.innerText.replace(/\n/g,' ').trim()));
console.log('buttons', JSON.stringify(btns.slice(0,40)));
const rowGeom = await p.evaluate(()=>{
  // find a skill row header
  const el=[...document.querySelectorAll('*')].find(e=>e.textContent?.trim().startsWith('Attack')&&e.children.length===0);
  const r=el.getBoundingClientRect();
  const card=el.closest('div[class*="rounded"]');
  return {nameLeft:Math.round(r.left), nameRight:Math.round(r.right), cardW: card?Math.round(card.getBoundingClientRect().width):null};
});
console.log('skill row', JSON.stringify(rowGeom));
// expand a skill
const chev = p.locator('button').filter({hasText:'Attack'});
console.log('attack btn count', await chev.count());
await p.getByRole('button',{name:/Attack/}).first().click().catch(e=>console.log('click fail',e.message));
await p.waitForTimeout(700);
await p.screenshot({path:'.review/shots/desktop-core/skills-expanded.png'});
// sort by gap
await p.getByRole('button',{name:/^GAP$/i}).click().catch(()=>{});
await p.waitForTimeout(600);
await p.screenshot({path:'.review/shots/desktop-core/skills-gap.png'});
// filter combat
await p.getByRole('button',{name:/^COMBAT$/i}).click().catch(()=>{});
await p.waitForTimeout(600);
console.log('h after combat', await p.evaluate(()=>document.documentElement.scrollHeight));
await p.screenshot({path:'.review/shots/desktop-core/skills-combat.png', fullPage:true});
console.log('errors',JSON.stringify(errs));
await b.close();
