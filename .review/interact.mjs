import { chromium } from '@playwright/test';
const B='http://localhost:4173/rs3-leaderboard';
const O='/home/mbaraofiorin/dev/rs3-leaderboard/.review/shots/desktop-wide/';
const b = await chromium.launch();
const p = await b.newPage({ viewport:{width:1920,height:1080} });
p.on('console', m => { if(m.type()==='error') console.log('CONSOLE ERR:', m.text()); });

const txt = async (sel) => (await p.locator(sel).first().innerText()).replace(/\n/g,' | ');

// ---------- GOALS ----------
await p.goto(B+'/goals',{waitUntil:'networkidle'}); await p.waitForTimeout(700);
const filterCards = async () => p.evaluate(()=>[...document.querySelectorAll('button, a')]
  .filter(e=>/GOALS/i.test(e.innerText)&&e.innerText.length<40).map(e=>e.innerText.replace(/\n/g,' ')));
console.log('GOALS filter cards (Decxus):', await filterCards());
console.log('GOALS overall label:', await p.locator('text=/% overall/').first().innerText());
console.log('GOALS done label:', await p.locator('text=/DONE/i').first().innerText());
await p.getByRole('button',{name:'Soclopata'}).first().click(); await p.waitForTimeout(600);
console.log('GOALS filter cards (Soclopata):', await filterCards());
console.log('GOALS overall label after switch:', await p.locator('text=/% overall/').first().innerText());
console.log('GOALS done after switch:', await p.locator('text=/DONE/i').first().innerText());
await p.screenshot({path:O+'i-goals-soclopata.png', clip:{x:220,y:56,width:1480,height:760}});

// click "Early" filter
await p.goto(B+'/goals',{waitUntil:'networkidle'}); await p.waitForTimeout(600);
const early = p.locator('button').filter({hasText:/Early/}).first();
await early.click(); await p.waitForTimeout(600);
console.log('after Early filter, h3s:', await p.locator('h3').allInnerTexts());
await p.screenshot({path:O+'i-goals-early.png', clip:{x:220,y:56,width:1480,height:700}});

// expand "1 REMAINING"
await p.goto(B+'/goals',{waitUntil:'networkidle'}); await p.waitForTimeout(600);
const rem = p.locator('button').filter({hasText:/REMAINING/i}).first();
await rem.click(); await p.waitForTimeout(500);
await p.screenshot({path:O+'i-goals-expanded.png', clip:{x:220,y:400,width:1480,height:700}});

// ---------- MONEY ----------
await p.goto(B+'/money',{waitUntil:'networkidle'}); await p.waitForTimeout(700);
const showing = async()=> (await p.locator('text=/Showing \\d+ of/').first().innerText());
console.log('MONEY showing:', await showing());
const avail = p.locator('button').filter({hasText:/AVAILABLE TO ME/i}).first();
await avail.click(); await p.waitForTimeout(600);
console.log('MONEY showing after AVAILABLE toggle:', await showing());
await p.screenshot({path:O+'i-money-avail.png', clip:{x:220,y:400,width:1480,height:900}});
const f2p = p.locator('button').filter({hasText:/^F2P$/}).first();
await f2p.click(); await p.waitForTimeout(600);
console.log('MONEY showing after F2P:', await showing());
await p.screenshot({path:O+'i-money-f2p.png', clip:{x:220,y:300,width:1480,height:900}});
// SHOW recipe toggle
await p.goto(B+'/money',{waitUntil:'networkidle'}); await p.waitForTimeout(600);
const show = p.locator('button').filter({hasText:/^SHOW$/}).first();
if (await show.count()) { await show.scrollIntoViewIfNeeded(); await show.click(); await p.waitForTimeout(500);
  await p.screenshot({path:O+'i-money-recipe.png'}); console.log('MONEY recipe expanded ok'); }

// ---------- PVM ----------
await p.goto(B+'/pvm',{waitUntil:'networkidle'}); await p.waitForTimeout(700);
console.log('PVM kills logged before:', await p.locator('text=/KILLS LOGGED/').first().evaluate(e=>e.parentElement.innerText.replace(/\n/g,' | ')));
const plus = p.locator('button').filter({hasText:/^\+$/}).first();
await plus.click(); await plus.click(); await plus.click(); await p.waitForTimeout(700);
console.log('PVM kills logged after 3 clicks:', await p.locator('text=/KILLS LOGGED/').first().evaluate(e=>e.parentElement.innerText.replace(/\n/g,' | ')));
await p.screenshot({path:O+'i-pvm-kills.png', clip:{x:220,y:56,width:1480,height:900}});
const ready = p.locator('button').filter({hasText:/READY ONLY/i}).first();
await ready.click(); await p.waitForTimeout(600);
console.log('PVM h3s after READY ONLY:', await p.locator('h3').allInnerTexts());
await p.screenshot({path:O+'i-pvm-ready.png', clip:{x:220,y:56,width:1480,height:900}});

// ---------- SKILLS ----------
await p.goto(B+'/skills',{waitUntil:'networkidle'}); await p.waitForTimeout(700);
const first = p.locator('button').filter({hasText:/Attack/}).first();
await first.click(); await p.waitForTimeout(500);
await p.screenshot({path:O+'i-skills-expanded.png', clip:{x:220,y:56,width:1480,height:800}});
const az = p.locator('button').filter({hasText:/^A-Z$/}).first();
await az.click(); await p.waitForTimeout(600);
await p.screenshot({path:O+'i-skills-az.png', clip:{x:220,y:56,width:1480,height:800}});
console.log('SKILLS after A-Z, first rows:', (await p.locator('li').allInnerTexts()).slice(0,3).map(s=>s.split('\n')[0]));

await b.close();
