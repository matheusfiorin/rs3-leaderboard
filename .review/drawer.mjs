import { chromium } from '@playwright/test';
const b = await chromium.launch();
const m = await b.newPage({ viewport:{width:390,height:844} });
await m.goto('http://localhost:4173/rs3-leaderboard/skills/', { waitUntil:'networkidle' });
await m.waitForTimeout(500);
const state = async (tag) => {
  const s = await m.evaluate(`(()=>{
    const a=document.querySelector('aside'); const r=a.getBoundingClientRect();
    const hb=document.querySelector('header button');
    return { asideLeft:Math.round(r.left), asideVisible:!!a.offsetParent, asideDisplay:getComputedStyle(a).display,
             btnLabel:hb.getAttribute('aria-label'), btnExpanded:hb.getAttribute('aria-expanded'),
             bodyOverflow:getComputedStyle(document.body).overflow,
             active:(document.activeElement.getAttribute('aria-label')||document.activeElement.innerText||document.activeElement.tagName).trim().slice(0,28) };
  })()`);
  console.log(tag.padEnd(26), JSON.stringify(s));
};
await state('initial');
await m.locator('header button').first().focus();
await m.keyboard.press('Enter');
await m.waitForTimeout(600);
await state('opened via keyboard');
await m.screenshot({ path:'.review/shots/a11y/drawer-open.png' });
await m.keyboard.press('Escape');
await m.waitForTimeout(700);
await state('after Escape');
await m.screenshot({ path:'.review/shots/a11y/drawer-after-escape.png' });

// reopen and tab out to prove no trap
await m.locator('header button').first().click();
await m.waitForTimeout(500);
await m.evaluate(`document.querySelector('header button').focus()`);
for (let i=0;i<3;i++){ await m.keyboard.press('Tab');
  console.log(' tab'+(i+1), await m.evaluate(`(()=>{const e=document.activeElement;const a=document.querySelector('aside');return{el:(e.getAttribute('aria-label')||e.innerText||'').trim().slice(0,24), insideDrawer:a.contains(e), inHeader:!!document.querySelector('header').contains(e)};})()`)); }
await m.screenshot({ path:'.review/shots/a11y/drawer-tabbed-out.png' });
await b.close();
