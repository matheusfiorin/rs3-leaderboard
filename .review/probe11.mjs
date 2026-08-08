import { chromium } from '@playwright/test';
const b = await chromium.launch();
const p = await b.newPage({ viewport:{width:1440,height:900} });
await p.goto('http://localhost:4173/rs3-leaderboard/goals',{waitUntil:'networkidle'});
await p.waitForTimeout(1200);
// expand a "REMAINING" collapsible
await p.evaluate(()=>{const b=[...document.querySelectorAll('button')].find(x=>/remaining/i.test(x.textContent)); b.scrollIntoView({block:'center'}); b.click();});
await p.waitForTimeout(700);
await p.screenshot({path:'.review/shots/desktop-core/goals-expanded.png'});
await b.close();

const b2 = await chromium.launch();
const p2 = await b2.newPage({ viewport:{width:1440,height:900} });
await p2.goto('http://localhost:4173/rs3-leaderboard/quests',{waitUntil:'networkidle'});
await p2.waitForTimeout(1200);
await p2.evaluate(()=>window.scrollTo(0,860));
await p2.waitForTimeout(400);
await p2.screenshot({path:'.review/shots/desktop-core/quests-header-row.png'});
await b2.close();
