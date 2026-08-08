import { chromium } from '@playwright/test';
const b = await chromium.launch();
const p = await b.newPage({ viewport:{width:1440,height:900} });
await p.goto('http://localhost:4173/rs3-leaderboard/goals',{waitUntil:'networkidle'});
await p.waitForTimeout(1200);
const read = async (tag) => {
  const d = await p.evaluate(()=>{
    const heads=[...document.querySelectorAll('section > h3')].map(h=>h.innerText.replace(/\n/g,' | '));
    const tiles=[...document.querySelectorAll('button')].map(b=>b.innerText.replace(/\n/g,' ')).filter(t=>/GOALS|goals/i.test(t));
    const overall=[...document.querySelectorAll('span')].map(s=>s.textContent).filter(t=>t&&/overall/.test(t));
    const rings=[...document.querySelectorAll('section svg + *, section *')].filter(e=>/^\d+$/.test(e.textContent?.trim()||'')&&e.children.length===0).map(e=>e.textContent.trim());
    return {heads,tiles,overall};
  });
  console.log(tag, JSON.stringify(d,null,1));
};
await read('DECXUS');
// switch player
await p.getByRole('button',{name:'Soclopata'}).click();
await p.waitForTimeout(800);
await read('SOCLOPATA');
await p.screenshot({path:'.review/shots/desktop-core/goals-soclopata.png', fullPage:true});
// click Early tier tile
await p.getByRole('button',{name:/Early/}).first().click();
await p.waitForTimeout(600);
await p.screenshot({path:'.review/shots/desktop-core/goals-early-filter.png', fullPage:true});
console.log('early filtered h', await p.evaluate(()=>document.documentElement.scrollHeight));
await b.close();
