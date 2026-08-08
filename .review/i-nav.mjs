import { chromium } from '@playwright/test';
const BASE = 'http://localhost:4173/rs3-leaderboard';
const OUT = '/home/mbaraofiorin/dev/rs3-leaderboard/.review/shots/interaction';
const b = await chromium.launch();
const p = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
const log = (...a) => console.log(...a);

await p.goto(BASE + '/pvm/', { waitUntil: 'networkidle' });
await p.waitForTimeout(1600);
await p.locator('[role=tablist][aria-label=Player] button').nth(1).click();
await p.waitForTimeout(700);
log('PvM selected:', await p.locator('[role=tablist][aria-label=Player] button[aria-selected=true]').innerText());

// client-side nav to Goals
await p.locator('aside a[href$="/goals/"], aside a[href$="/goals"]').first().click();
await p.waitForTimeout(1600);
log('Goals selected after client nav:', await p.locator('[role=group][aria-label=Player] button[aria-current=true]').innerText().catch(()=>'NONE (defaults to first)'));
log('goals closest line:', (await p.locator('main').innerText()).match(/CLOSEST CAMPAIGN[^\n]*/)?.[0]);

// select Soclopata on goals, then to GP
await p.locator('[role=group][aria-label=Player] button').nth(1).click();
await p.waitForTimeout(700);
await p.locator('aside a[href$="/money/"], aside a[href$="/money"]').first().click();
await p.waitForTimeout(2000);
log('GP podium head:', await p.locator('#podium-head').innerText().catch(()=>'?'));
log('GP selected:', await p.locator('main button[aria-pressed=true]').filter({hasText:/Decxus|Soclopata/}).innerText().catch(()=>'none'));

// then to skills
await p.locator('aside a[href$="/skills/"], aside a[href$="/skills"]').first().click();
await p.waitForTimeout(1600);
log('Skills plan-for active:', await p.locator('main button[aria-current=true]').innerText().catch(()=>'none'));
log('Skills combat hint:', (await p.locator('main').innerText()).match(/REVOLUTION BARS FOR \w+/)?.[0]);

// back button behaviour
await p.goBack();
await p.waitForTimeout(1500);
log('after goBack url:', new URL(p.url()).pathname, '| GP selected:', await p.locator('main button[aria-pressed=true]').filter({hasText:/Decxus|Soclopata/}).innerText().catch(()=>'none'));
await p.screenshot({ path: OUT + '/x-nav-back.png' });
await b.close();
