import { chromium } from '@playwright/test';
const B='http://localhost:4173/rs3-leaderboard';
const O='/home/mbaraofiorin/dev/rs3-leaderboard/.review/shots/mobile-core/';
const b = await chromium.launch();
const p = await (await b.newContext({viewport:{width:390,height:844}, deviceScaleFactor:2})).newPage();
const log=(...a)=>console.log(...a);

// active-state comparison
for (const r of ['/','/skills','/quests']){
  await p.goto(B+r,{waitUntil:'networkidle'}); await p.waitForTimeout(800);
  const res = await p.evaluate(()=>{
    const bar=[...document.querySelectorAll('a')].filter(a=>a.className.includes('h-16'));
    return bar.map(a=>({t:a.textContent.trim(), active:/text-white|text-\[/.test(a.className)?a.className.match(/text-[^\s]+/g):null}));
  });
  log(r, JSON.stringify(res));
}

// hamburger drawer
await p.goto(B+'/quests',{waitUntil:'networkidle'}); await p.waitForTimeout(800);
await p.locator('button[aria-label="Open navigation"]').click(); await p.waitForTimeout(700);
await p.screenshot({path:O+'int-drawer.png'});
log('drawer links', await p.evaluate(()=>[...document.querySelectorAll('a')].filter(a=>a.offsetParent&&a.className.includes('h-9')).map(a=>a.textContent.trim())));

// quest title in main list: link or not?
await p.keyboard.press('Escape'); await p.waitForTimeout(400);
log('main list title node', await p.evaluate(()=>{
  const el=[...document.querySelectorAll('*')].find(e=>e.children.length===0 && e.textContent.trim()==="'Phite Club");
  const r=el.getBoundingClientRect();
  let a=el.closest('a,button');
  return {tag:el.tagName, w:+r.width.toFixed(0), h:+r.height.toFixed(0), wrapper:a?a.tagName+':'+(a.getAttribute('href')||''):null};
}));

// row height + count of small interactive (real) targets
log('real interactive small targets', await p.evaluate(()=>{
  const els=[...document.querySelectorAll('a,button,input,select,[role="button"]')];
  const bad=els.filter(e=>{const r=e.getBoundingClientRect(); return r.width>0 && (r.width<44||r.height<44);});
  const m={}; bad.forEach(e=>{const r=e.getBoundingClientRect(); const k=e.tagName+' '+Math.round(r.width)+'x'+Math.round(r.height); m[k]=(m[k]||0)+1;});
  return {total:bad.length, groups:Object.entries(m).sort((a,b)=>b[1]-a[1]).slice(0,8)};
}));

// SKILLS interactions
await p.goto(B+'/skills',{waitUntil:'networkidle'}); await p.waitForTimeout(900);
const h0=await p.evaluate(()=>document.documentElement.scrollHeight);
await p.locator('button', {hasText:/^Combat$/}).first().click(); await p.waitForTimeout(600);
log('skills COMBAT filter', h0, '->', await p.evaluate(()=>document.documentElement.scrollHeight));
await p.screenshot({path:O+'int-skills-combat.png'});
await p.locator('button', {hasText:/^All$/}).first().click(); await p.waitForTimeout(400);
await p.locator('button', {hasText:/^Gap$/}).first().click(); await p.waitForTimeout(600);
await p.screenshot({path:O+'int-skills-gap.png'});
// expand chevron on first skill
const chev = p.locator('button:has(svg)').filter({hasNot:p.locator('text=/ALL|GAP|XP|A-Z|COMBAT/')});
log('chevrons', await chev.count());
const rows = await p.evaluate(()=>{
  const btns=[...document.querySelectorAll('button')].filter(b=>b.getAttribute('aria-expanded')!==null);
  return btns.slice(0,3).map(b=>({txt:b.textContent.trim().slice(0,30), exp:b.getAttribute('aria-expanded'), w:Math.round(b.getBoundingClientRect().width), h:Math.round(b.getBoundingClientRect().height)}));
});
log('aria-expanded buttons', rows);
// click first expandable
const ex = p.locator('button[aria-expanded]').first();
if (await ex.count()){ await ex.scrollIntoViewIfNeeded(); await ex.click(); await p.waitForTimeout(600); await p.screenshot({path:O+'int-skills-expanded.png'}); log('expanded ok'); }

// PLAN FOR switch
await p.locator('button', {hasText:/^Soclopata$/}).first().click().catch(()=>log('no soclopata btn'));
await p.waitForTimeout(700);
await p.screenshot({path:O+'int-skills-planfor-soclo.png'});

await b.close();
