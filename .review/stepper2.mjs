import { chromium } from '@playwright/test';
const b = await chromium.launch();
const p = await b.newPage({ viewport:{width:1440,height:900} });
await p.goto('http://localhost:4173/rs3-leaderboard/pvm/', { waitUntil:'networkidle' });
await p.waitForTimeout(700);
const inc = p.locator('button[aria-label="Increase"]').first();
const val = () => p.evaluate(`document.querySelector('input[aria-label="Kills"]').value`);
console.log('before', await val());
await inc.focus(); await p.keyboard.press('Enter'); await p.keyboard.press('Enter'); await p.waitForTimeout(300);
console.log('after 2x Enter', await val());
console.log('dup Kills inputs:', await p.evaluate(`document.querySelectorAll('input[aria-label="Kills"]').length`));
const bb = await inc.boundingBox();
if (bb) await p.screenshot({ path:'.review/shots/a11y/pvm-stepper.png', clip:{x:Math.max(0,bb.x-560),y:Math.max(0,bb.y-46),width:640,height:120} });
// headings across routes
for (const r of ['/skills/','/pvm/','/money/','/settings/','/quests/']) {
  await p.goto('http://localhost:4173/rs3-leaderboard'+r, { waitUntil:'networkidle' });
  console.log(r, await p.evaluate(`JSON.stringify({h1:document.querySelectorAll('h1').length, firstHeading:(document.querySelector('h1,h2,h3')||{}).tagName, title:document.title})`));
}
await b.close();
