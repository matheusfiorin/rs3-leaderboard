import { chromium } from '@playwright/test';
const b = await chromium.launch();
const p = await b.newPage({ viewport:{width:1440,height:900} });
await p.goto('http://localhost:4173/rs3-leaderboard/pvm/', { waitUntil:'networkidle' });
await p.waitForTimeout(700);
console.log(await p.evaluate(`(()=>{
  const inc=document.querySelector('button[aria-label="Increase"]');
  let wrap=inc.parentElement; for(let i=0;i<3;i++) wrap=wrap.parentElement;
  return { stepperHTML: inc.parentElement.outerHTML.replace(/\\s+/g,' ').slice(0,700),
           context: wrap.textContent.replace(/\\s+/g,' ').trim().slice(0,120) };
})()`));
// keyboard-operate a counter and see if the value updates + is announced
const inc = p.locator('button[aria-label="Increase"]').first();
await inc.focus();
const before = await p.evaluate(`document.querySelector('button[aria-label="Increase"]').parentElement.textContent.trim()`);
await p.keyboard.press('Enter'); await p.keyboard.press('Enter');
await p.waitForTimeout(400);
const after = await p.evaluate(`document.querySelector('button[aria-label="Increase"]').parentElement.textContent.trim()`);
console.log('counter before/after 2x Enter:', JSON.stringify(before), '->', JSON.stringify(after));
console.log('live regions:', await p.evaluate(`document.querySelectorAll('[aria-live],[role="status"],[role="alert"]').length`));
const bb = await inc.boundingBox();
if (bb) await p.screenshot({ path:'.review/shots/a11y/pvm-stepper.png', clip:{x:Math.max(0,bb.x-420),y:Math.max(0,bb.y-40),width:620,height:110} });
await b.close();
