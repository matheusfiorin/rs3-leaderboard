import { chromium } from '@playwright/test';
const BASE='http://localhost:4173/rs3-leaderboard';
const OUT='.review/shots/mobile-tools/';
const b = await chromium.launch();
const ctx = await b.newContext({viewport:{width:390,height:844}, deviceScaleFactor:2, isMobile:true, hasTouch:true});
const p = await ctx.newPage();
p.on('console', m=>{ if(m.type()==='error') console.log('  CONSOLE ERR:', m.text().slice(0,120)); });

async function go(r){ await p.goto(BASE+r, {waitUntil:'domcontentloaded'}); await p.waitForTimeout(1200); }

// ---- SETTINGS ----
await go('/settings');
const pill = await p.evaluate(()=>{
  const el=[...document.querySelectorAll('span')].find(s=>/local only/i.test(s.textContent||''));
  if(!el) return null; const r=el.getBoundingClientRect(); const cs=getComputedStyle(el);
  return {text:el.textContent, w:r.width, h:r.height, scrollH:el.scrollHeight, lineHeight:cs.lineHeight, whiteSpace:cs.whiteSpace, overflowing: el.scrollHeight > r.height+1};
});
console.log('SETTINGS pill:', JSON.stringify(pill));
await p.locator('h2:has-text("Sync")').scrollIntoViewIfNeeded();
await p.screenshot({path:OUT+'i-settings-head.png', clip:{x:0,y:100,width:390,height:340}});

// disabled create button?
const createBtn = p.locator('button:has-text("Create a sync code")');
console.log('create disabled:', await createBtn.isDisabled(), 'opacity:', await createBtn.evaluate(e=>getComputedStyle(e).opacity), 'cursor:', await createBtn.evaluate(e=>getComputedStyle(e).cursor));
// try the Link path with a garbage code
await p.fill('#sync-code','abcde-abcde-abcde-abcde');
const linkBtn = p.locator('button:has-text("Link")').first();
console.log('link disabled after typing:', await linkBtn.isDisabled());
await linkBtn.click();
await p.waitForTimeout(2500);
console.log('notice:', (await p.locator('[role=status]').allTextContents()));
await p.screenshot({path:OUT+'i-settings-link-error.png', fullPage:true});

// bottom padding vs fixed nav
const navInfo = await p.evaluate(()=>{
  const nav=[...document.querySelectorAll('nav,div')].find(n=>getComputedStyle(n).position==='fixed' && n.getBoundingClientRect().bottom>=window.innerHeight-2 && n.getBoundingClientRect().height>40 && /HOME/i.test(n.textContent||''));
  const main=document.querySelector('main');
  const cs=main?getComputedStyle(main):null;
  return {navH: nav?nav.getBoundingClientRect().height:null, mainPadBottom: cs?cs.paddingBottom:null, docH: document.documentElement.scrollHeight, winH: window.innerHeight};
});
console.log('nav/padding:', JSON.stringify(navInfo));
// scroll to very bottom and shoot
await p.evaluate(()=>window.scrollTo(0,document.body.scrollHeight));
await p.waitForTimeout(400);
await p.screenshot({path:OUT+'i-settings-bottom.png'});

// export button actually downloads?
const dl = p.waitForEvent('download', {timeout:4000}).catch(()=>null);
await p.locator('button:has-text("Export progress")').click();
const d = await dl;
console.log('export download:', d? await d.suggestedFilename() : 'NONE');

// import garbage
await p.fill('#import-json','not json');
await p.locator('button:has-text("Import and merge")').click();
await p.waitForTimeout(500);
console.log('import notice:', await p.locator('[role=status]').allTextContents());
await p.screenshot({path:OUT+'i-settings-import-error.png'});

// ---- LOOKUP ----
await go('/lookup');
const lookupBtn = p.locator('button:has-text("Look up")');
console.log('lookup btn bg:', await lookupBtn.evaluate(e=>getComputedStyle(e).backgroundColor), 'color:', await lookupBtn.evaluate(e=>getComputedStyle(e).color));
// empty submit
await lookupBtn.click(); await p.waitForTimeout(800);
await p.screenshot({path:OUT+'i-lookup-empty-submit.png'});
await p.fill('input','Zezima');
await lookupBtn.click();
await p.waitForTimeout(6000);
await p.screenshot({path:OUT+'i-lookup-result.png', fullPage:true});
console.log('lookup body text after search:', (await p.locator('main').innerText()).slice(0,600).replace(/\n/g,' | '));

// ---- ARCHIVE hero alignment ----
await go('/archive');
const hero = await p.evaluate(()=>{
  const out=[];
  document.querySelectorAll('*').forEach(()=>{});
  const labels=[...document.querySelectorAll('div,span,p')].filter(e=>/^(combat|total level|total xp)$/i.test((e.textContent||'').trim()) && e.children.length===0);
  return labels.map(l=>{const r=l.getBoundingClientRect(); const sib=l.nextElementSibling; const sr=sib?sib.getBoundingClientRect():null; return {label:l.textContent.trim(), labelH:Math.round(r.height), labelTop:Math.round(r.top), valTop:sr?Math.round(sr.top):null, val:sib?sib.textContent.trim().slice(0,20):null};});
});
console.log('ARCHIVE hero:', JSON.stringify(hero,null,1));
await p.screenshot({path:OUT+'i-archive-hero.png', clip:{x:0,y:100,width:390,height:300}});
const gridInfo = await p.evaluate(()=>{
  const t=[...document.querySelectorAll('*')].filter(e=>/^NEC$/.test((e.textContent||'').trim()));
  if(!t.length) return null; let tile=t[0]; while(tile && tile.getBoundingClientRect().width<60) tile=tile.parentElement;
  const g=tile.parentElement; const cs=getComputedStyle(g);
  return {cols:cs.gridTemplateColumns, children:g.children.length, lastTileW:Math.round(tile.getBoundingClientRect().width)};
});
console.log('ARCHIVE skill grid:', JSON.stringify(gridInfo));

// ---- ACTIVITY ----
await go('/activity');
const chips = await p.evaluate(()=>[...document.querySelectorAll('button')].map(b=>b.textContent.trim()).filter(Boolean));
console.log('ACTIVITY buttons:', JSON.stringify(chips));
const before = await p.locator('main').innerText();
await p.locator('button:has-text("Bosses")').click(); await p.waitForTimeout(500);
await p.screenshot({path:OUT+'i-activity-bosses.png', fullPage:true});
const after = await p.locator('main').innerText();
console.log('ACTIVITY filter changed content:', before!==after);
await p.locator('button:has-text("All")').first().click(); await p.waitForTimeout(300);
const sm = p.locator('button:has-text("Show 20 more")');
console.log('show more exists:', await sm.count());
if(await sm.count()){ await sm.click(); await p.waitForTimeout(600); console.log('after show more, still present:', await p.locator('button:has-text("Show")').count(), await p.locator('button:has-text("Show")').first().textContent().catch(()=>'')); }
await p.screenshot({path:OUT+'i-activity-expanded-bottom.png'});

// ---- MONEY ----
await go('/money');
const mchips = await p.evaluate(()=>[...document.querySelectorAll('button')].map(b=>b.textContent.trim()).filter(Boolean).slice(0,30));
console.log('MONEY buttons:', JSON.stringify(mchips));
const mBefore = (await p.locator('main').innerText()).length;
await p.locator('button:has-text("AFK")').first().click(); await p.waitForTimeout(500);
const mAfter = (await p.locator('main').innerText()).length;
console.log('MONEY AFK filter changed:', mBefore, '->', mAfter);
await p.screenshot({path:OUT+'i-money-afk.png', fullPage:true});
await p.screenshot({path:OUT+'i-money-afk-vp.png'});
const cardCount = await p.evaluate(()=>{
  const h=[...document.querySelectorAll('h3,h4')].map(e=>e.textContent.trim());
  return h.length;
});
console.log('money heading count:', cardCount);

// ---- LIVE ----
const t0=Date.now();
await p.goto(BASE+'/live', {waitUntil:'domcontentloaded'});
console.log('live domcontentloaded ms', Date.now()-t0);
await p.waitForTimeout(3000);
await p.screenshot({path:OUT+'i-live-initial.png'});
await p.locator('button:has-text("SOCLOPATA")').first().click().catch(e=>console.log('soclopata click fail',e.message));
await p.waitForTimeout(5000);
await p.screenshot({path:OUT+'i-live-soclopata.png', fullPage:true});
console.log('live text:', (await p.locator('main').innerText()).replace(/\n/g,' | ').slice(0,700));
await b.close();
