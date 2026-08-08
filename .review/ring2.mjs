import { chromium } from '@playwright/test';
const b = await chromium.launch();
const p = await b.newPage({ viewport:{width:1440,height:900} });
await p.goto('http://localhost:4173/rs3-leaderboard/skills/', { waitUntil:'networkidle' });
await p.waitForTimeout(300);
const btn = p.locator('button[aria-label="Refresh data"]');
await btn.focus();
console.log(await btn.evaluate(e=>{const c=getComputedStyle(e);return{outline:c.outline,offset:c.outlineOffset,color:c.color,radius:c.borderRadius};}));
// does the var work if applied directly?
console.log(await p.evaluate(`(()=>{const d=document.createElement('div');d.style.outline='2px solid var(--color-prayer-bright)';document.body.appendChild(d);const v=getComputedStyle(d).outlineColor;const d2=document.createElement('div');d2.style.color='red';d2.style.outlineColor='var(--color-prayer-bright)';document.body.appendChild(d2);return {inlineShorthand:v, inlineLonghand:getComputedStyle(d2).outlineColor};})()`));
// screenshot several focus states side by side
for (const [name, sel] of [['refresh','button[aria-label="Refresh data"]'],['chip','button:has-text("COMBAT")'],['skillrow','button[aria-expanded]']]) {
  const el = p.locator(sel).first();
  await el.focus(); await p.waitForTimeout(120);
  const bb = await el.boundingBox();
  await p.screenshot({ path: `.review/shots/a11y/ring-${name}.png`, clip:{x:Math.max(0,bb.x-14),y:Math.max(0,bb.y-14),width:Math.min(1440-Math.max(0,bb.x-14),bb.width+28),height:bb.height+28} });
  console.log(name, await el.evaluate(e=>getComputedStyle(e).outlineColor));
}
await b.close();
