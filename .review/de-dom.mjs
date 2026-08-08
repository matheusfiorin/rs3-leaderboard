import { chromium } from '@playwright/test';
const BASE = 'http://localhost:4173/rs3-leaderboard';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.goto(BASE + '/pvm', { waitUntil: 'networkidle' });
await p.waitForTimeout(400);
const ctrls = await p.evaluate(() => [...document.querySelectorAll('button,[role=button],a')].map(e => ({
  tag: e.tagName, role: e.getAttribute('role'), aria: e.getAttribute('aria-label'),
  pressed: e.getAttribute('aria-pressed'), text: e.innerText.replace(/\n/g, ' ').trim().slice(0, 30),
})).filter(x => x.text || x.aria));
console.log(JSON.stringify(ctrls.slice(0, 40), null, 1));
await b.close();
