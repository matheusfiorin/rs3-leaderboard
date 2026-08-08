import { chromium } from '@playwright/test';
const BASE = 'http://localhost:4173/rs3-leaderboard';
const OUT = '/home/mbaraofiorin/dev/rs3-leaderboard/.review/shots/interaction';
const b = await chromium.launch();
const p = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
const errs = [];
p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
p.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
const log = (...a) => console.log(...a);

// --- dashboard
await p.goto(BASE + '/', { waitUntil: 'networkidle' });
await p.waitForTimeout(1800);
log('=== HOME');
log('buttons:', JSON.stringify(await p.locator('main button').evaluateAll(e=>e.map(x=>x.innerText.replace(/\n/g,' ').trim().slice(0,40)))));
log('tablists:', JSON.stringify(await p.locator('main [role=tablist]').evaluateAll(e=>e.map(x=>x.getAttribute('aria-label')))));
log('details:', await p.locator('main details').count(), 'checkbox:', await p.locator('main input[type=checkbox]').count(), 'number:', await p.locator('main input[type=number]').count());
log('aria-expanded:', JSON.stringify(await p.locator('main [aria-expanded]').evaluateAll(e=>e.map(x=>x.innerText.replace(/\n/g,' ').trim().slice(0,40)+' :: '+x.getAttribute('aria-expanded')))));

// exercise every main button
const bts = p.locator('main button');
const n = await bts.count();
for (let i = 0; i < n; i++) {
  const label = (await bts.nth(i).innerText()).replace(/\n/g,' ').trim().slice(0,32);
  const before = await p.locator('main').innerText();
  await bts.nth(i).scrollIntoViewIfNeeded().catch(()=>{});
  await bts.nth(i).click({ timeout: 3000 }).catch(e=>log('  click failed', label));
  await p.waitForTimeout(450);
  const after = await p.locator('main').innerText();
  log(`btn[${i}] "${label}" changed page? ${before !== after} (url ${new URL(p.url()).pathname})`);
  if (new URL(p.url()).pathname !== '/rs3-leaderboard/') { await p.goto(BASE + '/', {waitUntil:'networkidle'}); await p.waitForTimeout(1200); }
}
await p.screenshot({ path: OUT + '/x-home-after-clicks.png', fullPage: true });

// topbar refresh button
const refresh = p.locator('header button[aria-label="Refresh data"]');
const tsBefore = await refresh.innerText();
await refresh.click();
await p.waitForTimeout(2500);
log('refresh label before/after:', JSON.stringify(tsBefore), '->', JSON.stringify(await refresh.innerText()));

// --- settings: is sync actually configured?
await p.goto(BASE + '/settings/', { waitUntil: 'networkidle' });
await p.waitForTimeout(1200);
log('=== SETTINGS');
log((await p.locator('main').innerText()).slice(0, 1200));
await p.screenshot({ path: OUT + '/x-settings.png', fullPage: true });

// --- money recipe details toggle
await p.goto(BASE + '/money/', { waitUntil: 'networkidle' });
await p.waitForTimeout(1800);
const det = p.locator('main details').first();
log('=== MONEY recipe details count:', await p.locator('main details').count());
await det.scrollIntoViewIfNeeded();
const t0 = await det.innerText();
await det.locator('summary').click();
await p.waitForTimeout(500);
const t1 = await det.innerText();
log('recipe opened?', t0 !== t1);
log('--- recipe ---\n' + t1.slice(0, 700));
await p.screenshot({ path: OUT + '/x-money-recipe-open.png' });

log('CONSOLE ERRORS:', JSON.stringify(errs, null, 1));
await b.close();
