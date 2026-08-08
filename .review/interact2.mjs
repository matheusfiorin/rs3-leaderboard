import { chromium } from '@playwright/test';
const B='http://localhost:4173/rs3-leaderboard';
const O='/home/mbaraofiorin/dev/rs3-leaderboard/.review/shots/desktop-wide/';
const b = await chromium.launch();
const p = await b.newPage({ viewport:{width:1920,height:1080} });
p.on('console', m => { if(m.type()==='error') console.log('CONSOLE ERR:', m.text()); });

// goals expanded details
await p.goto(B+'/goals',{waitUntil:'networkidle'}); await p.waitForTimeout(700);
await p.locator('summary').first().click(); await p.waitForTimeout(400);
await p.locator('summary').nth(1).click(); await p.waitForTimeout(400);
await p.screenshot({path:O+'i-goals-expanded.png', clip:{x:220,y:400,width:1480,height:900}});

// money
await p.goto(B+'/money',{waitUntil:'networkidle'}); await p.waitForTimeout(700);
const showing = async()=> (await p.locator('text=/Showing \\d+ of/').first().innerText());
console.log('MONEY showing:', await showing());
const avail = p.locator('button').filter({hasText:/AVAILABLE TO ME/i}).first();
await avail.click(); await p.waitForTimeout(600);
console.log('MONEY after AVAILABLE off:', await showing());
await p.screenshot({path:O+'i-money-avail.png', clip:{x:220,y:300,width:1480,height:900}});
await avail.click(); await p.waitForTimeout(400);
const f2p = p.locator('button').filter({hasText:/^f2p$/i}).first();
await f2p.click(); await p.waitForTimeout(600);
console.log('MONEY after F2P:', await showing());
await p.screenshot({path:O+'i-money-f2p.png', clip:{x:220,y:300,width:1480,height:1000}});
// gather-only
await p.goto(B+'/money',{waitUntil:'networkidle'}); await p.waitForTimeout(500);
await p.locator('button').filter({hasText:/^combat$/i}).first().click(); await p.waitForTimeout(600);
console.log('MONEY after COMBAT:', await showing());
await p.screenshot({path:O+'i-money-combat.png', clip:{x:220,y:300,width:1480,height:900}});
// recipe expand
await p.goto(B+'/money',{waitUntil:'networkidle'}); await p.waitForTimeout(500);
const sh = p.locator('button,summary').filter({hasText:/^show$/i}).first();
console.log('SHOW count:', await p.locator('text=/^SHOW$/').count());
if (await sh.count()) { await sh.scrollIntoViewIfNeeded(); await sh.click(); await p.waitForTimeout(500);
  const bb = await sh.boundingBox(); await p.screenshot({path:O+'i-money-recipe.png', clip:{x:220,y:Math.max(56,bb.y-300),width:1480,height:800}}); }

// pvm
await p.goto(B+'/pvm',{waitUntil:'networkidle'}); await p.waitForTimeout(700);
const kl = async()=> p.evaluate(()=>{const e=[...document.querySelectorAll('*')].find(x=>x.children.length===0&&/KILLS LOGGED/i.test(x.textContent));return e.parentElement.innerText.replace(/\n/g,' | ');});
console.log('PVM kills before:', await kl());
const plus = p.locator('button[aria-label*="ncrease" i], button').filter({hasText:/^\+$/}).first();
console.log('plus count:', await p.locator('button').filter({hasText:/^\+$/}).count());
for (let i=0;i<3;i++){ await plus.click(); await p.waitForTimeout(250); }
await p.waitForTimeout(600);
console.log('PVM kills after 3:', await kl());
await p.screenshot({path:O+'i-pvm-kills.png', clip:{x:220,y:56,width:1480,height:950}});
await p.locator('button').filter({hasText:/READY ONLY/i}).first().click(); await p.waitForTimeout(700);
console.log('PVM h3 after READY ONLY:', await p.locator('h3').allInnerTexts());
await p.screenshot({path:O+'i-pvm-ready.png', clip:{x:220,y:56,width:1480,height:950}});
await p.locator('button').filter({hasText:/^apex/i}).first().click(); await p.waitForTimeout(700);
await p.screenshot({path:O+'i-pvm-apex.png', clip:{x:220,y:56,width:1480,height:950}});

// skills
await p.goto(B+'/skills',{waitUntil:'networkidle'}); await p.waitForTimeout(700);
await p.locator('li button').first().click(); await p.waitForTimeout(500);
await p.screenshot({path:O+'i-skills-expanded.png', clip:{x:220,y:56,width:1480,height:900}});
await p.locator('button').filter({hasText:/^a-z$/i}).first().click(); await p.waitForTimeout(600);
await p.screenshot({path:O+'i-skills-az.png', clip:{x:220,y:56,width:1480,height:900}});
await p.locator('button').filter({hasText:/^gather$/i}).first().click(); await p.waitForTimeout(600);
await p.screenshot({path:O+'i-skills-gather.png', clip:{x:220,y:56,width:1480,height:900}});
await b.close();
