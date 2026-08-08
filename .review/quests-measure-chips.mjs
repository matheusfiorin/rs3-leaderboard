import { chromium } from '@playwright/test';
const BASE='http://localhost:4173/rs3-leaderboard';
const b=await chromium.launch();
for (const w of [360,390,640,768,1440]){
const p=await b.newPage({viewport:{width:w,height:800}});
await p.goto(BASE+'/quests/',{waitUntil:'networkidle'});
await p.waitForTimeout(600);
const r=await p.evaluate(()=>{
 const g=document.querySelector('[role=group]');
 const gb=g.getBoundingClientRect();
 const btns=Array.from(g.querySelectorAll('button')).map(x=>Math.round(x.getBoundingClientRect().width));
 const strip=g.parentElement.getBoundingClientRect();
 const search=document.querySelector('input[type=search]').getBoundingClientRect();
 return {group:{w:Math.round(gb.width),h:Math.round(gb.height)},btns,strip:{w:Math.round(strip.width),h:Math.round(strip.height)},searchW:Math.round(search.width)};
});
console.log(w, JSON.stringify(r));
await p.close();
}
await b.close();
