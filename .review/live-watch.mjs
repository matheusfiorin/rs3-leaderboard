import { chromium } from '@playwright/test';
const BASE='http://localhost:4173/rs3-leaderboard';
const OUT='.review/shots/mobile-tools/';
const b = await chromium.launch();
const ctx = await b.newContext({viewport:{width:390,height:844}, deviceScaleFactor:2, isMobile:true, hasTouch:true});
const p = await ctx.newPage();
let errs=0; p.on('console', m=>{if(m.type()==='error') errs++;});
await p.goto(BASE+'/live',{waitUntil:'domcontentloaded'});
for (let i=0;i<9;i++){
  await p.waitForTimeout(10000);
  const t=(await p.locator('main').innerText()).replace(/\n+/g,' | ');
  console.log(`t+${(i+1)*10}s errs=${errs} ::`, t.slice(0,320));
  if(i===2||i===8) await p.screenshot({path:OUT+`live-t${(i+1)*10}.png`, fullPage:true});
}
await b.close();
