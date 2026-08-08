import { chromium } from '@playwright/test';
const URL='file:///home/mbaraofiorin/dev/rs3-leaderboard/.review/quests-fixture.html';
const b=await chromium.launch();
for (const [name,vp,y] of [['m',{width:360,height:740},1200],['d',{width:1440,height:900},900]]){
  const p=await b.newPage({viewport:vp});
  await p.goto(URL); await p.waitForTimeout(200);
  await p.evaluate(y=>window.scrollTo(0,y), y);
  await p.waitForTimeout(200);
  await p.screenshot({path:`.review/shots/quests-fix-${name}.png`});
  await p.close();
}
await b.close();
