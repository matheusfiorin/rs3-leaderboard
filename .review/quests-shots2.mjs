import { chromium } from '@playwright/test';
const URL='file:///home/mbaraofiorin/dev/rs3-leaderboard/.review/quests-fixture.html';
const b=await chromium.launch();
const p=await b.newPage({viewport:{width:1440,height:900}});
await p.goto(URL); await p.waitForTimeout(200);
await p.evaluate(()=>window.scrollTo(0,1500));
await p.waitForTimeout(150);
// keyboard focus the 5th row link to see the ring, and hover the 3rd
await p.evaluate(()=>{ const as=[...document.querySelectorAll('#rows a')]; as[8].focus(); });
await p.hover('#rows > li:nth-child(4)');
await p.waitForTimeout(200);
await p.screenshot({path:'.review/shots/quests-fix-d2.png'});
await b.close();
