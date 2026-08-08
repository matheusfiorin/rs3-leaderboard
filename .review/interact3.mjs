import { chromium } from '@playwright/test';
const B='http://localhost:4173/rs3-leaderboard';
const O='/home/mbaraofiorin/dev/rs3-leaderboard/.review/shots/desktop-wide/';
const b = await chromium.launch();
const p = await b.newPage({ viewport:{width:1920,height:1080} });
p.on('console', m => { if(m.type()==='error') console.log('CONSOLE ERR:', m.text()); });
const kl = async()=> p.evaluate(()=>{const e=[...document.querySelectorAll('*')].find(x=>x.children.length===0&&/KILLS LOGGED/i.test(x.textContent));return e.parentElement.innerText.replace(/\n/g,' | ');});

await p.goto(B+'/pvm',{waitUntil:'networkidle'}); await p.waitForTimeout(800);
console.log('PVM before:', await kl());
const inc = p.getByLabel('Increase');
console.log('Increase buttons:', await inc.count());
for (let i=0;i<4;i++){ await inc.nth(0).click(); await p.waitForTimeout(200); }
await p.waitForTimeout(700);
console.log('PVM after 4 inc on boss1:', await kl());
await inc.nth(1).click(); await p.waitForTimeout(600);
console.log('PVM after 1 inc on boss2:', await kl());
await p.screenshot({path:O+'i-pvm-kills.png', clip:{x:220,y:56,width:1480,height:950}});
// unlocked stat
console.log('PVM unlocked stat:', await p.evaluate(()=>{const e=[...document.querySelectorAll('*')].find(x=>x.children.length===0&&/UNLOCKED/i.test(x.textContent));return e.parentElement.innerText.replace(/\n/g,' | ');}));
await p.locator('button').filter({hasText:/READY ONLY/i}).first().click(); await p.waitForTimeout(800);
console.log('PVM h3 after READY ONLY:', await p.locator('h3').allInnerTexts());
await p.screenshot({path:O+'i-pvm-ready.png', clip:{x:220,y:56,width:1480,height:950}});
await p.locator('button').filter({hasText:/^apex/i}).first().click(); await p.waitForTimeout(800);
await p.screenshot({path:O+'i-pvm-apex.png', clip:{x:220,y:56,width:1480,height:950}});
console.log('PVM h3 after APEX+READY:', await p.locator('h3').allInnerTexts());

// skills
await p.goto(B+'/skills',{waitUntil:'networkidle'}); await p.waitForTimeout(800);
await p.locator('li button').first().click(); await p.waitForTimeout(600);
await p.screenshot({path:O+'i-skills-expanded.png', clip:{x:220,y:56,width:1480,height:900}});
await p.locator('button').filter({hasText:/^a-z$/i}).first().click(); await p.waitForTimeout(600);
await p.screenshot({path:O+'i-skills-az.png', clip:{x:220,y:56,width:1480,height:900}});
await p.locator('button').filter({hasText:/^gather$/i}).first().click(); await p.waitForTimeout(600);
await p.screenshot({path:O+'i-skills-gather.png', clip:{x:220,y:56,width:1480,height:900}});
// combat collapsible at bottom
await p.goto(B+'/skills',{waitUntil:'networkidle'}); await p.waitForTimeout(600);
const combatSum = p.locator('summary, button').filter({hasText:/REVOLUTION BARS/i}).first();
if (await combatSum.count()){ await combatSum.scrollIntoViewIfNeeded(); await combatSum.click(); await p.waitForTimeout(700);
  const bb = await combatSum.boundingBox(); await p.screenshot({path:O+'i-skills-combat.png', clip:{x:220,y:Math.max(56,bb.y-40),width:1480,height:900}}); console.log('combat expanded'); }

// money recipe
await p.goto(B+'/money',{waitUntil:'networkidle'}); await p.waitForTimeout(700);
const sh = p.locator('summary').filter({hasText:/RECIPE/i}).first();
console.log('recipe summaries:', await p.locator('summary').count());
if (await sh.count()){ await sh.scrollIntoViewIfNeeded(); await sh.click(); await p.waitForTimeout(600);
  const bb=await sh.boundingBox(); await p.screenshot({path:O+'i-money-recipe.png', clip:{x:220,y:Math.max(56,bb.y-260),width:1480,height:800}}); }
await b.close();
