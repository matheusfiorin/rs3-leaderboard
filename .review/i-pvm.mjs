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

await p.goto(BASE + '/pvm/', { waitUntil: 'networkidle' });
await p.waitForTimeout(1500);

const playerTabs = p.locator('[role="tablist"][aria-label="Player"] button');
log('player tabs', (await playerTabs.allInnerTexts()).join('|'));

// summary cards before switch
const cardsBefore = await p.locator('main .grid').first().innerText();
log('--- summary before ---\n' + cardsBefore);

// --- CountInput: set Kills on the first boss card
const firstCard = p.locator('main section .grid > div').first();
const kcRow = p.locator('input[type=number]').first();
const nInputs = await p.locator('input[type=number]').count();
log('CountInputs on page:', nInputs);

// use the plus button on the first boss card
const plus = p.locator('button[aria-label="Increase"]').first();
const minus = p.locator('button[aria-label="Decrease"]').first();
await plus.scrollIntoViewIfNeeded();
log('minus disabled at 0?', await minus.isDisabled());
for (let i = 0; i < 3; i++) { await plus.click(); await p.waitForTimeout(120); }
log('after 3 plus, value =', await kcRow.inputValue());
await p.waitForTimeout(400);
const killsCard = await p.locator('text=/Kills logged/').first().locator('..').innerText();
log('Kills logged card after +3:\n' + killsCard);
await p.screenshot({ path: OUT + '/x-pvm-kc-3.png' });

// type directly
await kcRow.fill('');
await p.waitForTimeout(200);
log('after fill empty, value =', await kcRow.inputValue());
await kcRow.fill('250');
await p.waitForTimeout(400);
log('after fill 250, value =', await kcRow.inputValue());
// negative
await kcRow.fill('-5');
await p.waitForTimeout(300);
log('after fill -5, value =', await kcRow.inputValue());
//skip
await p.waitForTimeout(300);
//skip
await kcRow.fill('42');
await p.waitForTimeout(500);

// pill on card?
const cardTxt = await p.locator('button[aria-label="Increase"]').first().locator('xpath=ancestor::div[contains(@class,"flex-col")][1]').innerText().catch(()=>'n/a');
log('--- first boss card ---\n' + cardTxt.slice(0,400));

// --- switch player: does KC stay? does gate change?
const sumA = await p.locator('main .grid').first().innerText();
await playerTabs.nth(1).click();
await p.waitForTimeout(900);
const sumB = await p.locator('main .grid').first().innerText();
log('--- summary after player switch ---\n' + sumB);
log('summary changed on player switch?', sumA !== sumB);
log('first CountInput value after player switch =', await p.locator('input[type=number]').first().inputValue());
await p.screenshot({ path: OUT + '/x-pvm-player2.png' });

// which boss is first now (order may change)
const firstBossName = await p.locator('main section a[target=_blank]').first().innerText().catch(()=>'?');
log('first boss link now:', firstBossName);

// --- tier filter
const tierTabs = p.locator('[role="tablist"][aria-label="Difficulty tier"] button');
log('tier opts', (await tierTabs.allInnerTexts()).join(' | '));
const cardsAll = await p.locator('main section[aria-labelledby^="tier-"] a[target=_blank]').count();
await tierTabs.filter({ hasText: /apex/i }).click();
await p.waitForTimeout(500);
const cardsApex = await p.locator('main section[aria-labelledby^="tier-"] a[target=_blank]').count();
log('boss cards all', cardsAll, '-> apex', cardsApex);
await p.screenshot({ path: OUT + '/x-pvm-tier-apex.png' });

// group filter
const groupTabs = p.locator('[role="tablist"][aria-label="Group size"] button');
await groupTabs.filter({ hasText: /^Duo$/ }).click();
await p.waitForTimeout(500);
const cardsApexDuo = await p.locator('main section[aria-labelledby^="tier-"] a[target=_blank]').count();
log('apex+duo cards', cardsApexDuo);
const empty = await p.locator('main').innerText();
log('empty state shown?', empty.includes('Nothing matches'));
await p.screenshot({ path: OUT + '/x-pvm-empty.png' });
// tier counts while empty
log('tier counts now:', (await tierTabs.allInnerTexts()).join(' | '));

await groupTabs.filter({ hasText: /^Any$/ }).click();
await tierTabs.filter({ hasText: /^All/i }).click();
await p.waitForTimeout(400);

// ready only
const readyBtn = p.locator('button[aria-pressed]').filter({ hasText: /Ready only/i });
log('readyOnly aria-pressed before', await readyBtn.getAttribute('aria-pressed'));
await readyBtn.click();
await p.waitForTimeout(600);
log('readyOnly aria-pressed after', await readyBtn.getAttribute('aria-pressed'));
const cardsReady = await p.locator('main section[aria-labelledby^="tier-"] a[target=_blank]').count();
log('ready-only cards', cardsReady, 'of', cardsAll);
await p.screenshot({ path: OUT + '/x-pvm-readyonly.png' });

// --- reload: persistence of KC + of filters + of player pick
await p.reload({ waitUntil: 'networkidle' });
await p.waitForTimeout(1500);
log('AFTER RELOAD active player tab:', await p.locator('[role="tablist"][aria-label="Player"] button[aria-selected=true]').innerText());
log('AFTER RELOAD readyOnly:', await p.locator('button[aria-pressed]').filter({ hasText: /Ready only/i }).getAttribute('aria-pressed'));
const kcVals = await p.locator('input[type=number]').evaluateAll(els => els.map(e=>e.value).filter(v=>v!=='0'));
log('AFTER RELOAD nonzero KC values:', JSON.stringify(kcVals));
const killsCard2 = await p.locator('text=/Kills logged/').first().locator('..').innerText();
log('AFTER RELOAD kills card:\n' + killsCard2);

// localStorage dump
const ls = await p.evaluate(() => JSON.stringify(Object.fromEntries(Object.entries(localStorage))));
log('LOCALSTORAGE:', ls.slice(0, 1200));

log('CONSOLE ERRORS:', JSON.stringify(errs, null, 1));
await b.close();
