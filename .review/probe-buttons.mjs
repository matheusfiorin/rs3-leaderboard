import { chromium, devices } from '@playwright/test';
const BASE = 'http://localhost:4173/rs3-leaderboard';
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, userAgent: devices['iPhone 13'].userAgent });
const p = await ctx.newPage();
for (const r of process.argv.slice(2)) {
  await p.goto(BASE + r + '/', { waitUntil: 'networkidle' });
  await p.waitForTimeout(800);
  const info = await p.evaluate(() => [...document.querySelectorAll('button,input,summary,[role=button],a[href^="#"]')].slice(0, 60).map((e, i) => {
    const r = e.getBoundingClientRect();
    return { i, tag: e.tagName, type: e.type || '', text: (e.innerText || e.value || '').trim().replace(/\n/g, '~').slice(0, 30), aria: e.getAttribute('aria-label'), pressed: e.getAttribute('aria-pressed'), w: Math.round(r.width), h: Math.round(r.height) };
  }));
  console.log('=== ' + r);
  console.log(JSON.stringify(info));
}
await b.close();
