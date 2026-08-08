import { chromium } from '@playwright/test';
const B='http://localhost:4173/rs3-leaderboard';
const O='/home/mbaraofiorin/dev/rs3-leaderboard/.review/shots/desktop-wide/';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });

async function go(r){ await p.goto(B+r,{waitUntil:'networkidle'}); await p.waitForTimeout(700); }

// 1. pvm scrolled down: does sidebar rule / nav persist?
await go('/pvm');
await p.evaluate(()=>window.scrollTo(0,2600));
await p.waitForTimeout(400);
await p.screenshot({path:O+'crop-pvm-scrolled.png'});

// 2. pvm one section at 1:1
await p.evaluate(()=>window.scrollTo(0,0));
await p.waitForTimeout(300);
await p.screenshot({path:O+'crop-pvm-top.png', clip:{x:220,y:56,width:1480,height:1000}});

// 3. money chip bar + hero
await go('/money');
await p.screenshot({path:O+'crop-money-top.png', clip:{x:220,y:56,width:1480,height:900}});

// 4. goals top
await go('/goals');
await p.screenshot({path:O+'crop-goals-top.png', clip:{x:220,y:56,width:1480,height:800}});

// 5. home tonight's board
await go('/');
await p.evaluate(()=>{const h=[...document.querySelectorAll('h2')].find(e=>/Tonight/.test(e.textContent)); h.scrollIntoView({block:'start'});});
await p.waitForTimeout(400);
await p.screenshot({path:O+'crop-home-board.png', clip:{x:220,y:56,width:1480,height:700}});

// 6. skills rows 1:1
await go('/skills');
await p.screenshot({path:O+'crop-skills-top.png', clip:{x:220,y:56,width:1480,height:800}});

await b.close();
console.log('done');
