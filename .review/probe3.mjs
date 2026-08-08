import { chromium } from '@playwright/test';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width:1440, height:900 } });
const errs=[]; p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
await p.goto('http://localhost:4173/rs3-leaderboard/quests', { waitUntil:'networkidle' });
await p.waitForTimeout(1200);
const inputs = await p.evaluate(()=>[...document.querySelectorAll('input')].map(i=>({type:i.type,ph:i.placeholder,aria:i.getAttribute('aria-label')})));
console.log('inputs', JSON.stringify(inputs));
// search
const si = p.locator('input[type="search"], input[type="text"]').first();
await si.fill('dragon');
await p.waitForTimeout(700);
console.log('after search', JSON.stringify(await p.evaluate(()=>({h:document.documentElement.scrollHeight, rows:document.querySelectorAll('ul li').length}))));
await p.screenshot({path:'.review/shots/desktop-core/quests-search.png'});
// clear, then click filter chips
await si.fill('');
await p.waitForTimeout(400);
const chips = await p.evaluate(()=>[...document.querySelectorAll('button')].map(bt=>bt.innerText.replace(/\n/g,' ').trim()).filter(Boolean));
console.log('buttons', JSON.stringify(chips.slice(0,40)));
// click the D/S toggles on first row
const dsm = await p.evaluate(()=>{
  const li = document.querySelectorAll('ul li')[0];
  return [...li.querySelectorAll('*')].map(e=>({tag:e.tagName, t:(e.textContent||'').trim().slice(0,20), aria:e.getAttribute('aria-label'), title:e.getAttribute('title')})).filter(e=>e.tag==='BUTTON'||e.tag==='SPAN');
});
console.log('row1 parts', JSON.stringify(dsm));
console.log('errors', JSON.stringify(errs));
await b.close();
