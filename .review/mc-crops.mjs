import { chromium } from '@playwright/test';
const [route, label, nMax, startY] = process.argv.slice(2);
const O='/home/mbaraofiorin/dev/rs3-leaderboard/.review/shots/mobile-core/';
const b = await chromium.launch();
const p = await (await b.newContext({viewport:{width:390,height:844}, deviceScaleFactor:2})).newPage();
await p.goto('http://localhost:4173/rs3-leaderboard'+route, {waitUntil:'networkidle'});
await p.waitForTimeout(1200);
const h = await p.evaluate(()=>document.documentElement.scrollHeight);
const s0 = +(startY||0);
const n = Math.min(Math.ceil((h-s0)/760), nMax? +nMax : 8);
for (let i=0;i<n;i++){
  await p.evaluate(y=>window.scrollTo(0,y), s0 + i*760);
  await p.waitForTimeout(400);
  await p.screenshot({path:`${O}mc-${label}-${String(i).padStart(2,'0')}.png`});
}
console.log('height', h, 'crops', n);
await b.close();
