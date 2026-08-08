import { chromium } from '@playwright/test';
const O='/home/mbaraofiorin/dev/rs3-leaderboard/.review/shots/desktop-wide/';
const b = await chromium.launch();
for (const w of [1440,1920]) {
  const p = await b.newPage({ viewport:{width:w,height:900} });
  await p.goto('http://localhost:4173/rs3-leaderboard/skills',{waitUntil:'networkidle'}); await p.waitForTimeout(700);
  const m = await p.evaluate(()=>{
    const a=document.querySelector('aside'), h=document.querySelector('header'), mn=document.querySelector('main');
    const r=e=>{const b=e.getBoundingClientRect();return {x:Math.round(b.x),w:Math.round(b.width),h:Math.round(b.height)};};
    return {vw:innerWidth, aside:r(a), header:r(h), main:r(mn), asideBorder:getComputedStyle(a).borderRightWidth+' '+getComputedStyle(a).borderRightColor, bodyBg:getComputedStyle(document.body).backgroundColor};
  });
  console.log(w, JSON.stringify(m));
  await p.screenshot({path:O+`gutter-${w}.png`, clip:{x:0,y:0,width:Math.min(900,w),height:900}});
  await p.close();
}
await b.close();
