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

await p.goto(BASE + '/skills/', { waitUntil: 'networkidle' });
await p.waitForTimeout(1200);

// --- Plan for buttons
const planBtns = p.locator('button[type="button"]').filter({ hasText: /^(Decxus|Soclopata)$/ });
log('planFor count', await planBtns.count());

// combat collapsible hint before
const hintBefore = await p.locator('text=/Revolution bars for/').first().textContent().catch(()=>null);
log('combat hint before:', hintBefore);

// first row snapshot
const firstRowText = await p.locator('ul > li').first().innerText();
log('--- first li before ---\n', firstRowText.slice(0,200));

// switch plan-for to Soclopata
await planBtns.nth(1).click();
await p.waitForTimeout(400);
const hintAfter = await p.locator('text=/Revolution bars for/').first().textContent().catch(()=>null);
log('combat hint after:', hintAfter);
await p.screenshot({ path: OUT + '/x-skills-planfor-soclopata.png' });

// Does switching plan-for change anything else visible? diff main text
const mainA = await p.locator('main').innerText();
await planBtns.nth(0).click();
await p.waitForTimeout(300);
const mainB = await p.locator('main').innerText();
log('planFor toggle changed main text?', mainA !== mainB, 'lenA', mainA.length, 'lenB', mainB.length);

// --- category filter
const cats = p.locator('[role="tablist"][aria-label="Filter by skill category"] button');
log('cat count', await cats.count());
const rowsAll = await p.locator('section[aria-label="Skill comparison"] ul > li').count();
await cats.filter({ hasText: /combat/i }).click();
await p.waitForTimeout(300);
const rowsCombat = await p.locator('section[aria-label="Skill comparison"] ul > li').count();
log('rows all', rowsAll, '-> combat', rowsCombat);
await cats.filter({ hasText: /support/i }).click();
await p.waitForTimeout(300);
const rowsSupport = await p.locator('section[aria-label="Skill comparison"] ul > li').count();
const supportNames = await p.locator('section[aria-label="Skill comparison"] ul > li button span.text-sm').allInnerTexts().catch(()=>[]);
log('rows support', rowsSupport, supportNames.join(','));
await p.screenshot({ path: OUT + '/x-skills-cat-support.png' });
await cats.filter({ hasText: /^all$/i }).click();
await p.waitForTimeout(300);

// --- sort
const sorts = p.locator('[role="tablist"][aria-label="Sort skills"] button');
log('sort opts', (await sorts.allInnerTexts()).join('|'));
const namesDefault = await p.locator('section[aria-label="Skill comparison"] ul > li button span.text-sm').allInnerTexts();
await sorts.filter({ hasText: /gap/i }).click();
await p.waitForTimeout(300);
const namesGap = await p.locator('section[aria-label="Skill comparison"] ul > li button span.text-sm').allInnerTexts();
await sorts.filter({ hasText: /a-z|a–z|az/i }).click();
await p.waitForTimeout(300);
const namesAz = await p.locator('section[aria-label="Skill comparison"] ul > li button span.text-sm').allInnerTexts();
log('sort default[0..4]', namesDefault.slice(0,5).join(','));
log('sort gap[0..4]    ', namesGap.slice(0,5).join(','));
log('sort az[0..4]     ', namesAz.slice(0,5).join(','));

// --- expand a skill row
await sorts.filter({ hasText: /order|default/i }).first().click().catch(()=>{});
await p.waitForTimeout(200);
const row0 = p.locator('section[aria-label="Skill comparison"] ul > li').first();
await row0.locator('button[aria-expanded]').click();
await p.waitForTimeout(400);
log('row0 expanded?', await row0.locator('button[aria-expanded]').getAttribute('aria-expanded'));
await p.screenshot({ path: OUT + '/x-skills-row-expanded.png' });
const detail = await row0.innerText();
log('--- detail text ---\n', detail.slice(0, 900));

// does plan-for change the expanded detail?
const d1 = await row0.innerText();
await planBtns.nth(1).click();
await p.waitForTimeout(400);
const d2 = await row0.innerText();
log('expanded detail changes with planFor?', d1 !== d2);
await p.screenshot({ path: OUT + '/x-skills-row-expanded-soclo.png' });

// --- Check / CountInput inside skill detail?
log('checkboxes on skills page:', await p.locator('input[type=checkbox]').count());
log('number inputs on skills page:', await p.locator('input[type=number]').count());

// --- collapsible: Combat
const collap = p.locator('button[aria-expanded]').filter({ hasText: /Combat/ });
log('combat collapsible found', await collap.count());
if (await collap.count()) {
  await collap.first().scrollIntoViewIfNeeded();
  await collap.first().click();
  await p.waitForTimeout(500);
  log('combat expanded?', await collap.first().getAttribute('aria-expanded'));
  await p.screenshot({ path: OUT + '/x-skills-combat-open.png', fullPage: false });
  const styles = p.locator('[role="tablist"][aria-label="Combat style"] button');
  log('style opts', (await styles.allInnerTexts()).join('|'));
  const cbA = await p.locator('main').innerText();
  await styles.nth(1).click();
  await p.waitForTimeout(400);
  const cbB = await p.locator('main').innerText();
  log('combat style click changed content?', cbA !== cbB);
  await p.screenshot({ path: OUT + '/x-skills-combat-style2.png' });
}

// --- reload: does any of it persist?
await p.reload({ waitUntil: 'networkidle' });
await p.waitForTimeout(1000);
log('after reload: planFor aria-current on nth1?', await planBtns.nth(1).getAttribute('aria-current'));
log('after reload: cat active?', await p.locator('[role="tablist"][aria-label="Filter by skill category"] button[aria-selected=true]').innerText());
log('after reload: row0 expanded?', await p.locator('section[aria-label="Skill comparison"] ul > li').first().locator('button[aria-expanded]').getAttribute('aria-expanded'));
log('after reload: combat expanded?', await p.locator('button[aria-expanded]').filter({ hasText: /Combat/ }).first().getAttribute('aria-expanded'));

log('CONSOLE ERRORS:', JSON.stringify(errs, null, 1));
await b.close();
