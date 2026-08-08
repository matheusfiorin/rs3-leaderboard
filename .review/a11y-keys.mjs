import { chromium } from '@playwright/test';
const BASE = 'http://localhost:4173/rs3-leaderboard';
const browser = await chromium.launch();

const desc = () => `(() => {
  const el = document.activeElement;
  if(!el) return {none:true};
  const cs = getComputedStyle(el);
  const r = el.getBoundingClientRect();
  return {
    tag: el.tagName, role: el.getAttribute('role'),
    name: (el.innerText||el.value||el.getAttribute('aria-label')||'').trim().replace(/\\s+/g,' ').slice(0,42),
    outline: cs.outlineWidth + ' ' + cs.outlineStyle + ' ' + cs.outlineColor,
    boxShadow: cs.boxShadow.slice(0,40),
    inView: r.top >= -2 && r.bottom <= window.innerHeight + 2 && r.width>0,
    top: Math.round(r.top), h: Math.round(r.height), w: Math.round(r.width),
    ariaExpanded: el.getAttribute('aria-expanded'),
  };
})()`;

// ---------- 1. skip link ----------
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto(BASE + '/skills/', { waitUntil: 'networkidle' });
await page.keyboard.press('Tab');
console.log('SKIP LINK focused:', JSON.stringify(await page.evaluate(desc())));
await page.screenshot({ path: '.review/shots/a11y/focus-skiplink.png', clip: {x:0,y:0,width:700,height:200} });
await page.keyboard.press('Enter');
await page.waitForTimeout(300);
console.log('after Enter, hash=', page.url(), 'active=', JSON.stringify(await page.evaluate(desc())));
await page.keyboard.press('Tab');
console.log('next Tab after skip:', JSON.stringify(await page.evaluate(desc())));

// ---------- 2. tab walk on /skills ----------
console.log('\n--- TAB WALK /skills (first 22) ---');
await page.goto(BASE + '/skills/', { waitUntil: 'networkidle' });
await page.waitForTimeout(300);
for (let i = 0; i < 22; i++) {
  await page.keyboard.press('Tab');
  const d = await page.evaluate(desc());
  console.log(String(i+1).padStart(2) + ' ' + d.tag + ' "' + d.name + '" outline=' + d.outline + ' inView=' + d.inView + ' top=' + d.top);
}
await page.screenshot({ path: '.review/shots/a11y/focus-skills-22.png', fullPage: false });

// ---------- 3. skill collapsible via keyboard ----------
console.log('\n--- SKILL ROW TOGGLE ---');
await page.goto(BASE + '/skills/', { waitUntil: 'networkidle' });
const firstToggle = page.locator('[aria-expanded]').nth(2);
console.log('toggle html:', (await firstToggle.evaluate(e=>e.outerHTML)).slice(0,220));
await firstToggle.focus();
console.log('focused toggle:', JSON.stringify(await page.evaluate(desc())));
await page.keyboard.press('Enter');
await page.waitForTimeout(400);
console.log('after Enter expanded=', await firstToggle.getAttribute('aria-expanded'));
await page.screenshot({ path: '.review/shots/a11y/focus-skill-expanded.png', clip:{x:120,y:250,width:1320,height:520} });

// ---------- 4. /pvm heading text ----------
await page.goto(BASE + '/pvm/', { waitUntil: 'networkidle' });
const hs = await page.evaluate(`Array.from(document.querySelectorAll('h1,h2,h3,h4')).map(h=>h.tagName+': '+JSON.stringify(h.innerText))`);
console.log('\n--- /pvm headings ---'); console.log(hs.join('\n'));

// ---------- 5. /money show/hide contrast control ----------
await page.goto(BASE + '/money/', { waitUntil: 'networkidle' });
const sh = await page.evaluate(`(() => {
  const els = Array.from(document.querySelectorAll('*')).filter(e => ['show','hide'].includes(e.textContent.trim().toLowerCase()) && e.children.length===0);
  return els.slice(0,3).map(e => ({tag:e.tagName, cls:e.className.toString().slice(0,80), clickableAncestor: (()=>{let n=e;while(n){if(n.tagName==='BUTTON'||n.tagName==='SUMMARY'||n.tagName==='A')return n.tagName;n=n.parentElement;}return 'NONE';})(), color:getComputedStyle(e).color, fs:getComputedStyle(e).fontSize}));
})()`);
console.log('\n--- /money show/hide ---'); console.log(JSON.stringify(sh, null, 1));
await page.close();

// ---------- 6. mobile drawer keyboard ----------
console.log('\n--- MOBILE DRAWER ---');
const m = await browser.newPage({ viewport: { width: 390, height: 844 } });
await m.goto(BASE + '/skills/', { waitUntil: 'networkidle' });
await m.waitForTimeout(400);
const trigger = await m.evaluate(`(() => {
  const bs = Array.from(document.querySelectorAll('button'));
  return bs.map((b,i)=>({i, name:(b.innerText||b.getAttribute('aria-label')||'').trim().slice(0,30), aria:b.getAttribute('aria-label'), exp:b.getAttribute('aria-expanded'), ctrl:b.getAttribute('aria-controls')})).slice(0,8);
})()`);
console.log('mobile buttons:', JSON.stringify(trigger));
// find menu trigger
const menuBtn = m.locator('button[aria-label*="enu" i], button[aria-label*="av" i]').first();
const cnt = await menuBtn.count();
console.log('menu trigger count=', cnt);
if (cnt) {
  await menuBtn.click();
  await m.waitForTimeout(500);
  await m.screenshot({ path: '.review/shots/a11y/drawer-open.png' });
  console.log('drawer state:', JSON.stringify(await m.evaluate(`(() => {
    const d = document.querySelector('[role="dialog"], aside');
    return { hasDialogRole: !!document.querySelector('[role="dialog"]'), ariaModal: d && d.getAttribute('aria-modal'),
             bodyOverflow: getComputedStyle(document.body).overflow,
             activeEl: document.activeElement.tagName + ' ' + (document.activeElement.getAttribute('aria-label')||document.activeElement.innerText||'').trim().slice(0,30) };
  })()`)));
  // tab 6 times, see where focus goes
  for (let i=0;i<8;i++){ await m.keyboard.press('Tab'); const d = await m.evaluate(desc()); console.log('  drawer tab'+(i+1)+': '+d.tag+' "'+d.name+'" inView='+d.inView+' top='+d.top); }
  await m.keyboard.press('Escape');
  await m.waitForTimeout(500);
  const closed = await m.evaluate(`(() => { const a = document.querySelector('aside'); return { asideVisible: a ? !!a.offsetParent : null, transform: a?getComputedStyle(a).transform:null, activeEl: document.activeElement.tagName+' '+(document.activeElement.getAttribute('aria-label')||'').slice(0,20) }; })()`);
  console.log('after Escape:', JSON.stringify(closed));
  await m.screenshot({ path: '.review/shots/a11y/drawer-after-escape.png' });
}
await browser.close();
