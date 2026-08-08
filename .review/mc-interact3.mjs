import { chromium } from '@playwright/test';
const B='http://localhost:4173/rs3-leaderboard';
const O='/home/mbaraofiorin/dev/rs3-leaderboard/.review/shots/mobile-core/';
const b = await chromium.launch();
const p = await (await b.newContext({viewport:{width:390,height:844}, deviceScaleFactor:2})).newPage();
await p.goto(B+'/skills',{waitUntil:'networkidle'}); await p.waitForTimeout(1000);
const row = p.locator('button[aria-expanded]').filter({hasText:/Attack/}).first();
await row.scrollIntoViewIfNeeded(); await row.click(); await p.waitForTimeout(700);
await p.evaluate(()=>{const b=[...document.querySelectorAll('button[aria-expanded="true"]')][0]; b.scrollIntoView({block:'start'});});
await p.waitForTimeout(400);
await p.screenshot({path:O+'int-skills-row-open.png'});
// plan for switch
await p.evaluate(()=>window.scrollTo(0,0)); await p.waitForTimeout(300);
const btns = await p.evaluate(()=>[...document.querySelectorAll('button')].map(b=>b.textContent.trim()).slice(0,20));
console.log('buttons', btns);
await p.locator('button').filter({hasText:/^Soclopata$/}).first().click(); await p.waitForTimeout(800);
await p.screenshot({path:O+'int-skills-plan-soclo.png'});
// check whether anything above the fold changed
console.log('after switch, h', await p.evaluate(()=>document.documentElement.scrollHeight));
// combat section collapsible at bottom
const h=await p.evaluate(()=>document.documentElement.scrollHeight);
await p.evaluate(y=>window.scrollTo(0,y),h);
await p.waitForTimeout(500);
await p.screenshot({path:O+'int-skills-bottom.png'});
await b.close();
