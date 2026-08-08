import { chromium } from '@playwright/test';
const BASE = 'http://localhost:4173/rs3-leaderboard';
const OUT = '/home/mbaraofiorin/dev/rs3-leaderboard/.review/shots/desktop-endgame';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
const log = console.log;
const btn = (t) => p.locator('button').filter({ hasText: new RegExp('^' + t, 'i') }).first();

// ---- pvm filters
await p.goto(BASE + '/pvm', { waitUntil: 'networkidle' }); await p.waitForTimeout(400);
log('pvm h0', await p.evaluate(() => document.body.scrollHeight));
await btn('APEX').click(); await p.waitForTimeout(400);
log('after APEX h=', await p.evaluate(() => document.body.scrollHeight),
    'h3=', JSON.stringify(await p.evaluate(() => [...document.querySelectorAll('h3')].map(h => h.innerText.replace(/\n/g,' ')))));
await p.screenshot({ path: OUT + '/int-pvm-apex.png', clip: { x: 240, y: 0, width: 1200, height: 900 } });
await btn('SOLO').click(); await p.waitForTimeout(400);
log('after APEX+SOLO h=', await p.evaluate(() => document.body.scrollHeight));
await btn('READY ONLY').click(); await p.waitForTimeout(400);
log('after APEX+SOLO+READY h=', await p.evaluate(() => document.body.scrollHeight));
log('text:', (await p.evaluate(() => document.body.innerText)).replace(/\n+/g, ' | ').slice(0, 700));
await p.screenshot({ path: OUT + '/int-pvm-empty.png', clip: { x: 240, y: 0, width: 1200, height: 700 } });

// ---- pvm ready only alone
await p.goto(BASE + '/pvm', { waitUntil: 'networkidle' }); await p.waitForTimeout(300);
await btn('READY ONLY').click(); await p.waitForTimeout(400);
log('READY ONLY alone h=', await p.evaluate(() => document.body.scrollHeight));
await p.screenshot({ path: OUT + '/int-pvm-ready.png', clip: { x: 240, y: 0, width: 1200, height: 900 } });

// ---- pvm counter
await p.goto(BASE + '/pvm', { waitUntil: 'networkidle' }); await p.waitForTimeout(300);
const inc = p.locator('button[aria-label=Increase]').first();
const inp = p.locator('input').first();
await inc.scrollIntoViewIfNeeded();
log('before', await inp.inputValue());
for (let i = 0; i < 3; i++) { await inc.click(); await p.waitForTimeout(180); }
log('after 3 clicks', await inp.inputValue());
log('hero:', (await p.evaluate(() => document.body.innerText.match(/KILLS LOGGED[\s\S]{0,80}/)?.[0] || 'n/a')).replace(/\n/g, ' | '));
await p.evaluate(() => window.scrollTo(0, 0)); await p.waitForTimeout(300);
await p.screenshot({ path: OUT + '/int-pvm-counter.png', clip: { x: 240, y: 0, width: 1200, height: 760 } });
const dec = p.locator('button[aria-label=Decrease]').first();
log('dec disabled at 0? re-set:');
for (let i = 0; i < 5; i++) { await dec.click({ force: true }); await p.waitForTimeout(120); }
log('after 5 decs', await inp.inputValue(), 'disabled=', await dec.isDisabled());

// ---- capes chip title / +more
await p.goto(BASE + '/capes', { waitUntil: 'networkidle' }); await p.waitForTimeout(400);
const chip = p.locator('span.truncate').filter({ hasText: 'The Curse of Zaros' }).first();
log('chip:', JSON.stringify(await chip.evaluate(el => ({ own: el.title, parent: el.parentElement.title, txt: el.textContent }))));
const more = p.locator('span').filter({ hasText: /^\+\d+ more$/ }).first();
log('+more:', await more.evaluate(el => el.tagName + ' cursor=' + getComputedStyle(el).cursor + ' text=' + el.textContent));

// ---- capes player switch
const pre = await p.evaluate(() => document.body.innerText.replace(/\n+/g, ' | ').slice(0, 300));
await p.locator('button').filter({ hasText: /^SOCLOPATA$/i }).first().click(); await p.waitForTimeout(500);
const post = await p.evaluate(() => document.body.innerText.replace(/\n+/g, ' | ').slice(0, 300));
log('capes pre :', pre); log('capes post:', post);
await p.screenshot({ path: OUT + '/int-capes-switch.png', clip: { x: 240, y: 0, width: 1200, height: 900 } });

// ---- gear style tabs
await p.goto(BASE + '/gear', { waitUntil: 'networkidle' }); await p.waitForTimeout(400);
for (const s of ['MELEE', 'RANGED', 'MAGIC', 'NECRO']) {
  await p.locator('button').filter({ hasText: new RegExp('^' + s + '$', 'i') }).first().click();
  await p.waitForTimeout(400);
  log(s, '->', (await p.evaluate(() => document.body.innerText.replace(/\n+/g, ' | ').slice(0, 220))));
}
await p.locator('button').filter({ hasText: /^MAGIC$/i }).first().click(); await p.waitForTimeout(400);
await p.screenshot({ path: OUT + '/int-gear-magic.png', clip: { x: 240, y: 0, width: 1200, height: 900 } });

// ---- gear owned checkbox
await p.goto(BASE + '/gear', { waitUntil: 'networkidle' }); await p.waitForTimeout(400);
const bef = await p.evaluate(() => document.body.innerText.match(/\d+\s*\/\s*\d+\s*(\n|\s)*pieces marked owned/)?.[0]?.replace(/\n/g,' '));
const cbs = p.locator('input[type=checkbox]');
log('checkbox count', await cbs.count());
await cbs.first().evaluate(el => el.closest('label').scrollIntoView({ block: 'center' }));
await cbs.first().click({ force: true }); await p.waitForTimeout(600);
const aft = await p.evaluate(() => document.body.innerText.match(/\d+\s*\/\s*\d+\s*(\n|\s)*pieces marked owned/)?.[0]?.replace(/\n/g,' '));
log('owned before:', bef, '| after:', aft, '| checked now:', await p.locator('input[type=checkbox]:checked').count());
await p.evaluate(() => window.scrollTo(0, 0)); await p.waitForTimeout(300);
await p.screenshot({ path: OUT + '/int-gear-owned.png', clip: { x: 240, y: 0, width: 1200, height: 900 } });

// ---- dungeons filters
await p.goto(BASE + '/dungeons', { waitUntil: 'networkidle' }); await p.waitForTimeout(400);
for (const f of ['RAIDS', 'NECRO', 'ELITE']) {
  await p.locator('button').filter({ hasText: new RegExp('^' + f, 'i') }).first().click();
  await p.waitForTimeout(400);
  log('dun', f, 'h=', await p.evaluate(() => document.body.scrollHeight),
      JSON.stringify(await p.evaluate(() => [...document.querySelectorAll('h3')].map(h => h.innerText))));
}
await p.locator('button').filter({ hasText: /^NECRO/i }).first().click(); await p.waitForTimeout(400);
await p.screenshot({ path: OUT + '/int-dun-necro.png', clip: { x: 240, y: 0, width: 1200, height: 900 } });
await b.close();
