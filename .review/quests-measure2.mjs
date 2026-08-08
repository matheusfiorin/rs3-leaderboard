import { chromium } from '@playwright/test';
const URL='file:///home/mbaraofiorin/dev/rs3-leaderboard/.review/quests-fixture.html';
const b=await chromium.launch();
const p=await b.newPage({viewport:{width:360,height:740}});
await p.goto(URL); await p.waitForTimeout(200);
console.log(JSON.stringify(await p.evaluate(()=>{
  const q=(s)=>document.querySelector(s);
  const r=(el)=>{const x=el.getBoundingClientRect();return {l:Math.round(x.left),r:Math.round(x.right),w:Math.round(x.width)};};
  const sticky=q('#quest-filters');
  const row1=sticky.querySelector('.flex.items-center');
  const count=sticky.querySelectorAll('p')[0];
  const strip=q('.overflow-x-auto');
  return {
    stickyBox: r(sticky),
    row1: r(row1),
    count: r(count),
    countText: count.textContent,
    input: r(q('input')),
    strip: r(strip),
    stripScrollW: strip.scrollWidth,
    stripClientW: strip.clientWidth,
    docScroll: document.documentElement.scrollWidth,
    clientW: document.documentElement.clientWidth,
    bodyScroll: document.body.scrollWidth,
  };
}), null, 1));
await b.close();
