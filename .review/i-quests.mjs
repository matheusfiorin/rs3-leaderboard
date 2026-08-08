import { chromium } from '@playwright/test';
const BASE = 'http://localhost:4173/rs3-leaderboard';
const OUT = '/home/mbaraofiorin/dev/rs3-leaderboard/.review/shots/interaction';
const b = await chromium.launch();
const p = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
const errs = [];
p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
p.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
const log = (...a) => console.log(...a);

await p.goto(BASE + '/quests/', { waitUntil: 'networkidle' });
await p.waitForTimeout(1800);

// what controls exist?
log('inputs:', JSON.stringify(await p.locator('main input').evaluateAll(els=>els.map(e=>({type:e.type,ph:e.placeholder,aria:e.getAttribute('aria-label')})))));
log('tablists:', JSON.stringify(await p.locator('main [role=tablist]').evaluateAll(els=>els.map(e=>e.getAttribute('aria-label')))));
log('aria-pressed buttons:', JSON.stringify(await p.locator('main button[aria-pressed]').evaluateAll(els=>els.map(e=>e.innerText.trim()))));

const rowCount = async () => p.locator('main li').count();
log('rows initially:', await rowCount());
const head = await p.locator('main').innerText();
log('--- top of page ---\n' + head.slice(0, 800));

// search box
const search = p.locator('main input[type=search], main input[type=text]').first();
log('search exists:', await search.count());
if (await search.count()) {
  await search.fill('dragon');
  await p.waitForTimeout(700);
  log('after typing "dragon": rows =', await rowCount());
  await p.screenshot({ path: OUT + '/x-quests-search-dragon.png' });
  const names = await p.locator('main li').allInnerTexts();
  log('first 5 matches:', names.slice(0,5).map(t=>t.split('\n')[0]).join(' | '));
  // nonsense query -> empty state?
  await search.fill('zzzzqqq');
  await p.waitForTimeout(700);
  log('after nonsense: rows =', await rowCount(), '| empty copy?', (await p.locator('main').innerText()).slice(0,400).includes('No'));
  const mainTxt = await p.locator('main').innerText();
  log('empty region text:', mainTxt.match(/No[^\n]*/g)?.slice(0,3).join(' | '));
  await p.screenshot({ path: OUT + '/x-quests-search-empty.png' });
  await search.fill('');
  await p.waitForTimeout(600);
  log('after clearing: rows =', await rowCount());
}

// bucket segmented
const tabs = p.locator('main [role=tablist]').first().locator('button');
log('bucket opts:', (await tabs.allInnerTexts()).join(' | '));
for (let i = 0; i < await tabs.count(); i++) {
  await tabs.nth(i).click();
  await p.waitForTimeout(500);
  log('bucket', (await tabs.nth(i).innerText()).replace(/\n/g,' '), '-> rows', await rowCount());
}
await tabs.first().click();
await p.waitForTimeout(400);

// members-only toggle
const memb = p.locator('main button[aria-pressed]');
log('toggles found:', await memb.count(), JSON.stringify(await memb.allInnerTexts()));
for (let i = 0; i < await memb.count(); i++) {
  const t = (await memb.nth(i).innerText()).replace(/\n/g,' ');
  const before = await rowCount();
  await memb.nth(i).click();
  await p.waitForTimeout(600);
  log(`toggle "${t}": pressed=${await memb.nth(i).getAttribute('aria-pressed')} rows ${before} -> ${await rowCount()}`);
  await p.screenshot({ path: OUT + `/x-quests-toggle-${i}.png` });
  await memb.nth(i).click();
  await p.waitForTimeout(400);
}

// combine search + bucket
await search.fill('while guthix');
await p.waitForTimeout(700);
log('search "while guthix" rows:', await rowCount(), '| bucket counts now:', (await tabs.allInnerTexts()).join(' | '));
await search.fill('');
await p.waitForTimeout(500);

// expand a quest row
const firstRow = p.locator('main li').first();
const expandable = firstRow.locator('button[aria-expanded], summary');
log('first row expandable:', await expandable.count());
if (await expandable.count()) {
  await expandable.first().click();
  await p.waitForTimeout(500);
  log('--- expanded row ---\n' + (await firstRow.innerText()).slice(0,600));
  await p.screenshot({ path: OUT + '/x-quests-row-open.png' });
}
log('checkboxes on quests page:', await p.locator('main input[type=checkbox]').count());

// reload
await p.reload({ waitUntil: 'networkidle' });
await p.waitForTimeout(1500);
log('AFTER RELOAD rows:', await rowCount(), 'search value:', await p.locator('main input').first().inputValue().catch(()=>'n/a'));
log('CONSOLE ERRORS:', JSON.stringify(errs, null, 1));
await b.close();
