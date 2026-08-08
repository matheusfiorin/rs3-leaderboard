import { chromium } from '@playwright/test';
const BASE = 'http://localhost:4173/rs3-leaderboard';
const OUT = '/home/mbaraofiorin/dev/rs3-leaderboard/.review/shots/interaction';
const b = await chromium.launch();
const p = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
const log = (...a) => console.log(...a);
const reqs = [];
p.on('request', r => { if (/data\//.test(r.url())) reqs.push(r.url().split('/').pop()); });

await p.goto(BASE + '/', { waitUntil: 'networkidle' });
await p.waitForTimeout(1500);
reqs.length = 0;
const refresh = p.locator('header button[aria-label="Refresh data"]');
await refresh.click();
await p.waitForTimeout(300);
log('spinning 300ms after click?', await refresh.locator('svg').evaluate(e=>e.className.baseVal||e.getAttribute('class')));
await p.waitForTimeout(2500);
log('data requests fired by refresh:', JSON.stringify(reqs));
log('label:', await refresh.innerText());
log('svg class after:', await refresh.locator('svg').evaluate(e=>e.getAttribute('class')));

// settings buttons state
await p.goto(BASE + '/settings/', { waitUntil: 'networkidle' });
await p.waitForTimeout(1200);
const btns = await p.locator('main button').evaluateAll(e=>e.map(x=>({label:x.innerText.replace(/\n/g,' ').trim().slice(0,30), disabled:x.disabled})));
log('settings buttons:', JSON.stringify(btns, null, 1));
const inputs = await p.locator('main input').evaluateAll(e=>e.map(x=>({t:x.type,ph:x.placeholder,dis:x.disabled})));
log('settings inputs:', JSON.stringify(inputs));
// try the code field + Link
const codeInput = p.locator('main input[type=text]').first();
if (await codeInput.count()) {
  await codeInput.fill('abcdef123456');
  await p.waitForTimeout(200);
  const linkBtn = p.locator('main button').filter({ hasText: /^Link$/ });
  log('Link disabled?', await linkBtn.isDisabled().catch(()=>'n/a'));
  if (!(await linkBtn.isDisabled().catch(()=>true))) {
    await linkBtn.click();
    await p.waitForTimeout(2000);
    log('after Link attempt:\n' + (await p.locator('main').innerText()).slice(0,700));
  }
}
// export button
const exp = p.locator('main button').filter({ hasText: /Export progress/ });
log('Export disabled?', await exp.isDisabled().catch(()=>'n/a'));
await p.screenshot({ path: OUT + '/x-settings-link.png', fullPage: true });
await b.close();
