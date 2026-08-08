import { chromium } from '@playwright/test';
const b = await chromium.launch();
const p = await b.newPage({ viewport:{width:1440,height:900} });
await p.goto('http://localhost:4173/rs3-leaderboard/skills/', { waitUntil:'networkidle' });
await p.waitForTimeout(400);
// Tab to the filter chip row and screenshot immediately (as a keyboard user sees it)
for (let i=0;i<22;i++) await p.keyboard.press('Tab');
console.log('at stop22:', await p.evaluate(`(()=>{const e=document.activeElement;const c=getComputedStyle(e);return{name:e.innerText.trim(),outlineColor:c.outlineColor,transitionProperty:c.transitionProperty,dur:c.transitionDuration};})()`));
await p.screenshot({ path:'.review/shots/a11y/ring-immediate.png', clip:{x:130,y:370,width:600,height:130} });
await p.waitForTimeout(600);
await p.screenshot({ path:'.review/shots/a11y/ring-settled.png', clip:{x:130,y:370,width:600,height:130} });
console.log('settled:', await p.evaluate(`getComputedStyle(document.activeElement).outlineColor`));

// skill row focus, full width
await p.goto('http://localhost:4173/rs3-leaderboard/skills/', { waitUntil:'networkidle' });
const t = p.locator('button[aria-expanded]').nth(3);
await t.focus(); await p.waitForTimeout(500);
const bb = await t.boundingBox(); console.log('skillrow bb', bb);
if (bb) await p.screenshot({ path:'.review/shots/a11y/ring-skillrow.png', clip:{x:bb.x-16,y:bb.y-16,width:bb.width+32,height:bb.height+32} });
await p.close();

// ---- drawer: after-Escape focus target + roles ----
const m = await b.newPage({ viewport:{width:390,height:844} });
await m.goto('http://localhost:4173/rs3-leaderboard/skills/', { waitUntil:'networkidle' });
await m.waitForTimeout(400);
await m.locator('button[aria-label="Open navigation"]').click();
await m.waitForTimeout(500);
console.log('\nDRAWER dom:', await m.evaluate(`(()=>{
  const a=document.querySelector('aside');
  const overlay=Array.from(document.querySelectorAll('div')).find(d=>{const c=getComputedStyle(d);return c.position==='fixed'&&parseFloat(c.zIndex)>=30&&d.getBoundingClientRect().width>300&&d.getBoundingClientRect().height>700;});
  return {asideOuterStart:a.outerHTML.slice(0,240), asideRole:a.getAttribute('role'), ariaModal:a.getAttribute('aria-modal'), ariaLabel:a.getAttribute('aria-label'),
          overlayTag: overlay? overlay.outerHTML.slice(0,160):'none',
          headerInert: document.querySelector('header').hasAttribute('inert'),
          mainInert: document.querySelector('main').hasAttribute('inert')};
})()`));
await m.keyboard.press('Escape'); await m.waitForTimeout(600);
console.log('after Escape active:', await m.evaluate(`(()=>{const e=document.activeElement;return{tag:e.tagName,cls:(e.className||'').toString().slice(0,90),text:(e.innerText||'').trim().slice(0,30),aria:e.getAttribute('aria-label'),html:e.outerHTML.slice(0,150),visible:!!e.offsetParent};})()`));
// can drawer be reopened by keyboard from that point?
await m.screenshot({ path:'.review/shots/a11py-tmp.png' });
await b.close();
