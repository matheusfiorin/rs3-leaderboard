import { chromium } from '@playwright/test';
const BASE = 'http://localhost:4173/rs3-leaderboard';
const OUT = '/home/mbaraofiorin/dev/rs3-leaderboard/.review/shots/desktop-endgame';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
const log = (...a) => console.log(...a);

async function cardCount() {
  return p.locator('a[href*="runescape.wiki"], a[target="_blank"]').count();
}

// ---------- /pvm filters ----------
await p.goto(BASE + '/pvm', { waitUntil: 'networkidle' });
await p.waitForTimeout(400);
const h0 = await p.evaluate(() => document.body.scrollHeight);
log('pvm initial height', h0);

for (const label of ['APEX', 'GROUP', 'READY ONLY']) {
  const btn = p.getByRole('button', { name: new RegExp('^' + label, 'i') }).first();
  const n = await btn.count();
  if (!n) { log('MISSING button', label); continue; }
  await btn.click();
  await p.waitForTimeout(350);
  const h = await p.evaluate(() => document.body.scrollHeight);
  const visible = await p.evaluate(() => document.body.innerText.length);
  log(`clicked ${label}: height=${h} textLen=${visible}`);
}
await p.screenshot({ path: OUT + '/int-pvm-filtered.png', clip: { x: 240, y: 0, width: 1200, height: 900 } });

// empty state test: apex + solo + ready only
await p.goto(BASE + '/pvm', { waitUntil: 'networkidle' });
await p.waitForTimeout(300);
await p.getByRole('button', { name: /^APEX/i }).first().click();
await p.getByRole('button', { name: /^SOLO/i }).first().click();
await p.getByRole('button', { name: /READY ONLY/i }).first().click();
await p.waitForTimeout(400);
log('apex+solo+ready height', await p.evaluate(() => document.body.scrollHeight));
await p.screenshot({ path: OUT + '/int-pvm-empty.png', clip: { x: 240, y: 0, width: 1200, height: 760 } });
log('body text after triple filter:', (await p.evaluate(() => document.body.innerText)).replace(/\n+/g, ' | ').slice(0, 900));

// ---------- pvm counter ----------
await p.goto(BASE + '/pvm', { waitUntil: 'networkidle' });
await p.waitForTimeout(300);
const plus = p.getByRole('button', { name: /increase|\+/ }).first();
log('plus buttons:', await p.getByRole('button', { name: /increase/i }).count());
const inputs = p.locator('input[type="number"], input[inputmode="numeric"]');
log('numeric inputs:', await inputs.count());
if (await inputs.count()) {
  const first = inputs.first();
  await first.scrollIntoViewIfNeeded();
  const before = await first.inputValue();
  // click the sibling + button
  const box = await first.boundingBox();
  await p.mouse.click(box.x + box.width + 24, box.y + box.height / 2);
  await p.waitForTimeout(250);
  await p.mouse.click(box.x + box.width + 24, box.y + box.height / 2);
  await p.waitForTimeout(250);
  log('counter before', before, 'after', await first.inputValue());
  const kills = await p.evaluate(() => document.body.innerText.match(/KILLS LOGGED[\s\S]{0,60}/)?.[0]);
  log('hero kills stat:', JSON.stringify(kills));
  await p.screenshot({ path: OUT + '/int-pvm-counter.png', clip: { x: 240, y: 0, width: 1200, height: 800 } });
}

// ---------- hover a truncated chip ----------
await p.goto(BASE + '/capes', { waitUntil: 'networkidle' });
await p.waitForTimeout(400);
const chip = p.locator('span.truncate').filter({ hasText: 'The Curse of Zaros' }).first();
const cinfo = await chip.evaluate(el => ({
  own: el.getAttribute('title'), parentTitle: el.parentElement.getAttribute('title'),
  text: el.textContent,
}));
log('chip title info:', JSON.stringify(cinfo));

// +N more clickable?
const more = p.locator('span', { hasText: /^\+\d+ more$/ }).first();
log('+more tag:', await more.evaluate(el => el.tagName + ' cursor=' + getComputedStyle(el).cursor));

// ---------- gear style tabs + owned sync ----------
await p.goto(BASE + '/gear', { waitUntil: 'networkidle' });
await p.waitForTimeout(400);
for (const s of ['MELEE', 'RANGED', 'MAGIC']) {
  await p.getByRole('button', { name: new RegExp('^' + s + '$', 'i') }).first().click();
  await p.waitForTimeout(350);
  const sub = await p.evaluate(() => document.querySelector('h2')?.nextElementSibling?.textContent);
  const total = await p.evaluate(() => document.body.innerText.match(/pieces marked owned[\s\S]{0,0}/) ? document.body.innerText.match(/\d+\s*\/\s*\d+\s*pieces marked owned/)?.[0] : null);
  log(`style ${s}: sub=${JSON.stringify(sub)}`);
}
await p.screenshot({ path: OUT + '/int-gear-magic.png', clip: { x: 240, y: 0, width: 1200, height: 900 } });

// tick an Owned checkbox in the shortlist, see if table + hero update
await p.goto(BASE + '/gear', { waitUntil: 'networkidle' });
await p.waitForTimeout(400);
const before = await p.evaluate(() => document.body.innerText.match(/(\d+)\s*\/\s*(\d+)\s*pieces marked owned/)?.[0]);
const cb = p.locator('input[type="checkbox"]').first();
await cb.evaluate(el => el.closest('label')?.scrollIntoView({ block: 'center' }));
await p.waitForTimeout(200);
await cb.click({ force: true });
await p.waitForTimeout(500);
const after = await p.evaluate(() => document.body.innerText.match(/(\d+)\s*\/\s*(\d+)\s*pieces marked owned/)?.[0]);
log('owned stat before:', before, 'after:', after);
await p.evaluate(() => window.scrollTo(0, 0));
await p.waitForTimeout(300);
await p.screenshot({ path: OUT + '/int-gear-owned.png', clip: { x: 240, y: 0, width: 1200, height: 900 } });
const nChecked = await p.locator('input[type="checkbox"]:checked').count();
log('checked count after one click:', nChecked);

// ---------- player switch on capes ----------
await p.goto(BASE + '/capes', { waitUntil: 'networkidle' });
await p.waitForTimeout(400);
const t1 = await p.evaluate(() => document.body.innerText.slice(0, 400).replace(/\n+/g, ' | '));
await p.getByRole('button', { name: /^SOCLOPATA$/i }).first().click();
await p.waitForTimeout(500);
const t2 = await p.evaluate(() => document.body.innerText.slice(0, 400).replace(/\n+/g, ' | '));
log('capes before switch:', t1);
log('capes after  switch:', t2);
await p.screenshot({ path: OUT + '/int-capes-socло.png', clip: { x: 240, y: 0, width: 1200, height: 900 } });

// ---------- dungeons filters ----------
await p.goto(BASE + '/dungeons', { waitUntil: 'networkidle' });
await p.waitForTimeout(400);
for (const f of ['RAIDS', 'NECRO', 'ELITE']) {
  await p.getByRole('button', { name: new RegExp('^' + f, 'i') }).first().click();
  await p.waitForTimeout(400);
  const heads = await p.evaluate(() => [...document.querySelectorAll('h3')].map(h => h.textContent.trim()));
  log(`dungeons ${f}: h3=${JSON.stringify(heads)} height=${await p.evaluate(() => document.body.scrollHeight)}`);
}
await p.screenshot({ path: OUT + '/int-dun-elite.png', clip: { x: 240, y: 0, width: 1200, height: 900 } });

await b.close();
