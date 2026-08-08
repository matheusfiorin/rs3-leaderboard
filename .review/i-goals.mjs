import { chromium } from '@playwright/test';
const BASE = 'http://localhost:4173/rs3-leaderboard';
const OUT = '/home/mbaraofiorin/dev/rs3-leaderboard/.review/shots/interaction';
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
const p = await ctx.newPage();
const errs = [];
p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
p.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
const log = (...a) => console.log(...a);

await p.goto(BASE + '/goals/', { waitUntil: 'networkidle' });
await p.waitForTimeout(1500);
await p.screenshot({ path: OUT + '/x-goals-initial.png', fullPage: true });

// tier tiles
const tiles = p.locator('main div.grid').first().locator('button');
log('tier tiles:', (await tiles.allInnerTexts()).map(t=>t.replace(/\n/g,' ')).join(' || '));
const secsAll = await p.locator('main section').count();
await tiles.nth(1).click();
await p.waitForTimeout(500);
log('after tile1 click, sections:', await p.locator('main section').count(), 'of', secsAll);
await p.screenshot({ path: OUT + '/x-goals-tier1.png', fullPage: true });
// click again = toggle back to all?
await tiles.nth(1).click();
await p.waitForTimeout(400);
log('after tile1 click again, sections:', await p.locator('main section').count());

// player switch
const pbtns = p.locator('[role=group][aria-label=Player] button');
log('player buttons:', (await pbtns.allInnerTexts()).join('|'));
const headA = await p.locator('main').innerText();
await pbtns.nth(1).click();
await p.waitForTimeout(800);
const headB = await p.locator('main').innerText();
log('player switch changed page?', headA !== headB);
log('closest campaign line:', (headB.match(/CLOSEST CAMPAIGN.*\n.*/) || [''])[0]);
await p.screenshot({ path: OUT + '/x-goals-player2.png', fullPage: true });

// pill top-right "x / y done"
log('done pill:', await p.locator('main').locator('text=/\\d+ \\/ \\d+ done/').first().innerText().catch(()=>'n/a'));

// details expand — find one with manual checks
const dets = p.locator('details');
log('details count', await dets.count());
let target = -1;
for (let i = 0; i < await dets.count(); i++) {
  await dets.nth(i).locator('summary').click();
  await p.waitForTimeout(150);
  const n = await dets.nth(i).locator('input[type=checkbox]').count();
  if (n > 0) { log('details', i, 'has', n, 'checkboxes'); target = i; break; }
  await dets.nth(i).locator('summary').click();
}
log('target details', target);
if (target >= 0) {
  const d = dets.nth(target);
  await d.scrollIntoViewIfNeeded();
  await p.screenshot({ path: OUT + '/x-goals-details-open.png' });
  const labels = await d.locator('label').allInnerTexts();
  log('check labels:', labels.slice(0,6).join(' | '));
  const meterBefore = await d.locator('xpath=../..').innerText().catch(()=>'');
  // capture the Manual meter value in the enclosing card
  const card = d.locator('xpath=..');
  const cardBefore = await card.innerText();
  log('MANUAL meter before:', (cardBefore.match(/Manual\s*\n?\s*\d+\/\d+/) || [''])[0], '| remaining:', (cardBefore.match(/\d+ remaining/)||[''])[0]);
  const cb = d.locator('input[type=checkbox]').first();
  await cb.locator('xpath=..').click();
  await p.waitForTimeout(600);
  log('checkbox checked?', await cb.isChecked());
  const cardAfter = await card.innerText();
  log('MANUAL meter after :', (cardAfter.match(/Manual\s*\n?\s*\d+\/\d+/) || [''])[0], '| remaining:', (cardAfter.match(/\d+ remaining/)||[''])[0]);
  await p.screenshot({ path: OUT + '/x-goals-check-ticked.png' });

  // does it leak across players?
  const before = await cb.isChecked();
  await pbtns.nth(0).click();
  await p.waitForTimeout(800);
  log('after switching player, details still open?', await dets.nth(target).evaluate(e=>e.open).catch(()=>'?'));
  const nOpen = await p.locator('details[open]').count();
  log('open details after player switch:', nOpen);
  // find the same check
  const anyChecked = await p.locator('input[type=checkbox]:checked').count();
  log('checked boxes visible for other player:', anyChecked, '(was checked for previous player:', before, ')');
  await p.screenshot({ path: OUT + '/x-goals-check-otherplayer.png', fullPage: true });
}

// reload persistence
await p.reload({ waitUntil: 'networkidle' });
await p.waitForTimeout(1500);
log('AFTER RELOAD active player:', await p.locator('[role=group][aria-label=Player] button[aria-current=true]').innerText().catch(()=>'none'));
log('AFTER RELOAD open details:', await p.locator('details[open]').count());
const ls = await p.evaluate(() => localStorage.getItem('sexta-era:progress'));
log('LS:', ls);
// expand all details and count checked
for (let i = 0; i < await p.locator('details').count(); i++) await p.locator('details').nth(i).locator('summary').click();
await p.waitForTimeout(500);
log('AFTER RELOAD checked boxes (all details open):', await p.locator('input[type=checkbox]:checked').count());

log('CONSOLE ERRORS:', JSON.stringify(errs, null, 1));
await b.close();
