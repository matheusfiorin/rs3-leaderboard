import { chromium } from '@playwright/test';
const B='http://localhost:4173/rs3-leaderboard';
const O='/home/mbaraofiorin/dev/rs3-leaderboard/.review/shots/mobile-core/';
const b = await chromium.launch();
const ctx = await b.newContext({viewport:{width:390,height:844}, deviceScaleFactor:2});
const p = await ctx.newPage();
const log=(...a)=>console.log(...a);

// ---------- QUESTS ----------
await p.goto(B+'/quests',{waitUntil:'networkidle'}); await p.waitForTimeout(1000);

log('--- nav active state on /quests ---');
log(await p.evaluate(()=>{
  const nav=document.querySelector('nav[aria-label], nav');
  const links=[...document.querySelectorAll('a')].filter(a=>/^(HOME|SKILLS|PVM|GOALS|LIVE)$/i.test(a.textContent.trim()));
  return links.map(a=>({t:a.textContent.trim(), cur:a.getAttribute('aria-current'), cls:a.className.slice(0,60)}));
}));

log('--- D/S badge: tag, size, interactive? ---');
log(await p.evaluate(()=>{
  const els=[...document.querySelectorAll('button,div,span')].filter(e=>e.textContent.trim()==='D'||e.textContent.trim()==='S');
  const s=els.slice(0,6).map(e=>{const r=e.getBoundingClientRect();return {tag:e.tagName,txt:e.textContent.trim(),w:+r.width.toFixed(0),h:+r.height.toFixed(0),title:e.getAttribute('title'),aria:e.getAttribute('aria-label'),role:e.getAttribute('role')};});
  return {count:els.length, sample:s};
}));

log('--- is search/filter bar sticky? ---');
log(await p.evaluate(()=>{
  const inp=document.querySelector('input[type="search"],input[placeholder*="Search" i]');
  let e=inp, out=[];
  while(e && e!==document.body){ const cs=getComputedStyle(e); if(cs.position!=='static') out.push({tag:e.tagName,cls:e.className.slice(0,40),pos:cs.position,top:cs.top}); e=e.parentElement; }
  return out;
}));

log('--- body padding-bottom vs fixed nav height ---');
log(await p.evaluate(()=>{
  const nav=[...document.querySelectorAll('nav,div')].find(e=>getComputedStyle(e).position==='fixed' && e.getBoundingClientRect().bottom>800 && e.getBoundingClientRect().height>40);
  const main=document.querySelector('main');
  return {navH: nav? nav.getBoundingClientRect().height:null, mainPB: main? getComputedStyle(main).paddingBottom:null, bodyPB:getComputedStyle(document.body).paddingBottom};
}));

// type in search
const search = p.locator('input[placeholder*="Search" i]').first();
await search.click(); await search.fill('dragon slayer'); await p.waitForTimeout(700);
log('--- after search "dragon slayer" ---');
log(await p.evaluate(()=>({h:document.documentElement.scrollHeight, txt:document.body.innerText.match(/\d+ quests?/g)})));
await p.screenshot({path:O+'int-quests-search.png'});
await search.fill('zzzznotaquest'); await p.waitForTimeout(600);
await p.screenshot({path:O+'int-quests-empty.png'});
log('empty state height', await p.evaluate(()=>document.documentElement.scrollHeight));
await search.fill(''); await p.waitForTimeout(400);

// filter chips
for (const t of ['BOTH','STARTED','NONE']){
  const btn = p.locator('button', {hasText: new RegExp('^'+t,'i')}).first();
  await btn.click(); await p.waitForTimeout(600);
  log('filter', t, await p.evaluate(()=>({h:document.documentElement.scrollHeight, count:(document.body.innerText.match(/(\d+) quests/)||[])[1]})));
}
await p.screenshot({path:O+'int-quests-none.png'});

// members only toggle
const mem = p.locator('button', {hasText:/MEMBERS ONLY/i}).first();
if (await mem.count()){ await p.locator('button', {hasText:/^ALL/i}).first().click(); await p.waitForTimeout(400); const before=await p.evaluate(()=>document.documentElement.scrollHeight); await mem.click(); await p.waitForTimeout(600); log('members-only toggle', before, '->', await p.evaluate(()=>document.documentElement.scrollHeight)); await p.screenshot({path:O+'int-quests-members.png'}); }

// click a quest row
log('--- click quest row ---');
const row = p.locator('text=Dragon Slayer').first();
if (await row.count()){ const u0=p.url(); await row.click({force:true}); await p.waitForTimeout(700); log('url', u0, '->', p.url()); await p.screenshot({path:O+'int-quests-rowclick.png'}); }

await b.close();
