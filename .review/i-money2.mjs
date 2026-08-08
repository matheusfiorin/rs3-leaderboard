import { chromium } from '@playwright/test';
const BASE = 'http://localhost:4173/rs3-leaderboard';
const OUT = '/home/mbaraofiorin/dev/rs3-leaderboard/.review/shots/interaction';
const b = await chromium.launch();
const p = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
const log = (...a) => console.log(...a);
await p.goto(BASE + '/money/', { waitUntil: 'networkidle' });
await p.waitForTimeout(1800);
const showing = () => p.locator('text=/Showing \\d+ of \\d+ methods/').first().innerText();
const intTabs = p.locator('[role=tablist][aria-label="Intensity"] button');
for (let i = 0; i < await intTabs.count(); i++) {
  await intTabs.nth(i).click();
  await p.waitForTimeout(500);
  log('intensity', await intTabs.nth(i).innerText(), '->', await showing());
}
await intTabs.first().click();
await p.waitForTimeout(400);
// turn off availableOnly to see all 68 and count unpriced cards
await p.locator('button[aria-pressed]').filter({ hasText: /Available to me/i }).click();
await p.waitForTimeout(800);
log('all:', await showing());
const cardTexts = await p.locator('main div.grid.md\\:grid-cols-2 > div').allInnerTexts();
log('cards rendered:', cardTexts.length);
const unpriced = cardTexts.filter(t => /—\s*\/\s*h|no price|unpriced/i.test(t));
log('cards that look unpriced:', unpriced.length);
log('--- last card (worst sorted) ---\n' + cardTexts[cardTexts.length-1]);
log('--- a locked card ---\n' + (cardTexts.find(t=>/STILL NEEDS|to go/i.test(t))||'').slice(0,600));
// screenshot the tail of the list
await p.locator('main div.grid.md\\:grid-cols-2 > div').last().scrollIntoViewIfNeeded();
await p.waitForTimeout(300);
await p.screenshot({ path: OUT + '/x-money-tail.png' });
await b.close();
