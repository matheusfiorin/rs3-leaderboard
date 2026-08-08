import { chromium } from '@playwright/test';
const BASE='http://localhost:4173/rs3-leaderboard';
const OUT='.review/shots/mobile-tools/';
const b = await chromium.launch();
const ctx = await b.newContext({viewport:{width:390,height:844}, deviceScaleFactor:2, isMobile:true, hasTouch:true});
const p = await ctx.newPage();
await p.goto(BASE+'/money',{waitUntil:'domcontentloaded'}); await p.waitForTimeout(1200);
await p.screenshot({path:OUT+'c-money-hero.png'});
await p.evaluate(()=>window.scrollTo(0,700)); await p.waitForTimeout(300);
await p.screenshot({path:OUT+'c-money-filters.png'});
await p.evaluate(()=>window.scrollTo(0,1300)); await p.waitForTimeout(300);
await p.screenshot({path:OUT+'c-money-list.png'});
// check filter bar horizontal scroll / clipping
const rows = await p.evaluate(()=>{
  return [...document.querySelectorAll('div')].filter(d=>d.scrollWidth>d.clientWidth+2 && d.clientWidth>200).map(d=>({cls:d.className.slice(0,80), sw:d.scrollWidth, cw:d.clientWidth, text:(d.textContent||'').slice(0,60)}));
});
console.log('scrollable rows:', JSON.stringify(rows,null,1));
// activity
await p.goto(BASE+'/activity',{waitUntil:'domcontentloaded'}); await p.waitForTimeout(1000);
await p.screenshot({path:OUT+'c-activity-hero.png'});
// archive hero
await p.goto(BASE+'/archive',{waitUntil:'domcontentloaded'}); await p.waitForTimeout(1000);
await p.screenshot({path:OUT+'c-archive-hero.png'});
await p.evaluate(()=>window.scrollTo(0,1650)); await p.waitForTimeout(300);
await p.screenshot({path:OUT+'c-archive-grid-end.png'});
await p.evaluate(()=>window.scrollTo(0,document.body.scrollHeight)); await p.waitForTimeout(300);
await p.screenshot({path:OUT+'c-archive-bottom.png'});
// lookup long wait
await p.goto(BASE+'/lookup',{waitUntil:'domcontentloaded'}); await p.waitForTimeout(800);
await p.fill('input','Zezima');
await p.locator('button:has-text("Look up")').click();
for (const t of [3,10,20,35]) {
  await p.waitForTimeout(t*1000 - (t===3?0:0));
  const txt = (await p.locator('main').innerText()).replace(/\n/g,' | ');
  console.log('lookup @', t, 's:', txt.slice(0,300));
  await p.screenshot({path:OUT+`c-lookup-${t}s.png`});
  break;
}
// keep polling states
for (let i=0;i<6;i++){ await p.waitForTimeout(5000); const txt=(await p.locator('main').innerText()).replace(/\n/g,' | '); console.log('lookup t+'+(3+5*(i+1))+'s:', txt.slice(0,250)); }
await p.screenshot({path:OUT+'c-lookup-final.png', fullPage:true});
await b.close();
