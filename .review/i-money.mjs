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

await p.goto(BASE + '/money/', { waitUntil: 'networkidle' });
await p.waitForTimeout(1800);

const stats = await p.locator('main div.grid').first().innerText();
log('--- stats ---\n' + stats);
const showing = () => p.locator('text=/Showing \\d+ of \\d+ methods/').first().innerText();
log('showing:', await showing());
const cards = () => p.locator('main div.grid.md\\:grid-cols-2 > div').count();

// player switch
const pbtns = p.locator('main button[aria-pressed]').filter({ hasText: /Decxus|Soclopata/ });
log('player btns:', (await pbtns.allInnerTexts()).join('|'));
const headA = await p.locator('#podium-head').innerText();
const showA = await showing();
await pbtns.nth(1).click();
await p.waitForTimeout(1000);
log('podium head after switch:', await p.locator('#podium-head').innerText(), '| was', headA);
log('showing after switch:', await showing(), '| was', showA);
log('best rate stat now:', (await p.locator('main div.grid').first().innerText()).replace(/\n/g,' / '));
await p.screenshot({ path: OUT + '/x-money-player2.png' });

// filters
for (const [label, pick] of [['Category', /combat/i], ['Intensity', /afk/i], ['Membership', /f2p/i]]) {
  const tabs = p.locator(`[role=tablist][aria-label="${label}"] button`);
  log(label, 'opts:', (await tabs.allInnerTexts()).join('|'));
  const before = await showing();
  const opt = tabs.filter({ hasText: pick });
  if (await opt.count()) {
    await opt.first().click();
    await p.waitForTimeout(600);
    log(`  ${label} -> ${await opt.first().innerText()}:`, await showing(), '(was', before + ')');
  }
  await p.screenshot({ path: OUT + `/x-money-filter-${label}.png` });
  await tabs.first().click();
  await p.waitForTimeout(400);
}

// sort: closest — should auto-turn-off availableOnly
const availBtn = p.locator('button[aria-pressed]').filter({ hasText: /Available to me/i });
log('availableOnly before:', await availBtn.getAttribute('aria-pressed'));
const sortTabs = p.locator('[role=tablist][aria-label="Sort"] button');
const order1 = await p.locator('main div.grid.md\\:grid-cols-2 h4, main div.grid.md\\:grid-cols-2 a').allInnerTexts().catch(()=>[]);
await sortTabs.filter({ hasText: /closest/i }).click();
await p.waitForTimeout(800);
log('availableOnly after choosing Closest:', await availBtn.getAttribute('aria-pressed'));
log('showing:', await showing());
await p.screenshot({ path: OUT + '/x-money-sort-closest.png' });
// toggle available back on: should flip sort back to gp
await availBtn.click();
await p.waitForTimeout(700);
log('after clicking Available to me: pressed=', await availBtn.getAttribute('aria-pressed'), 'sort active=', await p.locator('[role=tablist][aria-label="Sort"] button[aria-selected=true]').innerText());
log('showing:', await showing());

// method card interactions
const firstCard = p.locator('main div.grid.md\\:grid-cols-2 > div').first();
log('--- first method card ---\n' + (await firstCard.innerText()).slice(0,700));
const inner = await firstCard.locator('button, details, input').count();
log('interactive elements in first card:', inner);
const cardBtns = await firstCard.locator('button').allInnerTexts();
log('card buttons:', JSON.stringify(cardBtns));
if (await firstCard.locator('button').count()) {
  const t0 = await firstCard.innerText();
  await firstCard.locator('button').first().click();
  await p.waitForTimeout(500);
  const t1 = await firstCard.innerText();
  log('first card button changed card?', t0 !== t1);
  await p.screenshot({ path: OUT + '/x-money-card-expanded.png' });
  log('--- after ---\n' + t1.slice(0,900));
}

// empty state
const catTabs = p.locator('[role=tablist][aria-label="Category"] button');
const intTabs = p.locator('[role=tablist][aria-label="Intensity"] button');
await catTabs.last().click(); await p.waitForTimeout(300);
await intTabs.last().click(); await p.waitForTimeout(600);
log('narrow filters ->', await showing().catch(()=>'n/a'));
log('empty state?', (await p.locator('main').innerText()).includes('No method matches'));
await p.screenshot({ path: OUT + '/x-money-empty.png' });

// reload
await p.reload({ waitUntil: 'networkidle' });
await p.waitForTimeout(1800);
log('AFTER RELOAD showing:', await showing());
log('AFTER RELOAD active player:', await p.locator('main button[aria-pressed=true]').filter({ hasText: /Decxus|Soclopata/ }).innerText().catch(()=>'none'));
log('AFTER RELOAD availableOnly:', await p.locator('button[aria-pressed]').filter({ hasText: /Available to me/i }).getAttribute('aria-pressed'));

log('CONSOLE ERRORS:', JSON.stringify(errs, null, 1));
await b.close();
