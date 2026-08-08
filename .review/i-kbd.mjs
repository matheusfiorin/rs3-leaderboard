import { chromium } from '@playwright/test';
const BASE = 'http://localhost:4173/rs3-leaderboard';
const b = await chromium.launch();
const p = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
const log = (...a) => console.log(...a);
await p.goto(BASE + '/skills/', { waitUntil: 'networkidle' });
await p.waitForTimeout(1500);

const tabs = p.locator('[role=tablist][aria-label="Filter by skill category"] button');
await tabs.first().focus();
log('focused:', await p.evaluate(()=>document.activeElement.innerText.trim()));
log('tabindex values:', JSON.stringify(await tabs.evaluateAll(e=>e.map(x=>x.getAttribute('tabindex')))));
await p.keyboard.press('ArrowRight');
await p.waitForTimeout(300);
log('after ArrowRight, focused:', await p.evaluate(()=>document.activeElement.innerText.trim()), '| selected:', await p.locator('[role=tablist][aria-label="Filter by skill category"] button[aria-selected=true]').innerText());
await p.keyboard.press('Tab');
log('after Tab, focused:', await p.evaluate(()=>document.activeElement.innerText.trim().slice(0,20)));
// how many tabs to escape the two tablists?
let hops = 1;
for (let i=0;i<12;i++){ await p.keyboard.press('Tab'); hops++; const t = await p.evaluate(()=>document.activeElement.innerText.trim().slice(0,20)); if(/Attack/.test(t)) { log('reached first skill row after', hops, 'tabs'); break; } }
// tabpanel present?
log('role=tabpanel count:', await p.locator('[role=tabpanel]').count());
// aria-controls on tabs?
log('aria-controls:', JSON.stringify(await tabs.evaluateAll(e=>e.map(x=>x.getAttribute('aria-controls')))));
await b.close();
