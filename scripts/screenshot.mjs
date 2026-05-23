import { chromium } from '@playwright/test';
const url = process.argv[2] || 'http://localhost:8080/';
const out = process.argv[3] || '/tmp/rs3-screenshot.png';
const viewport = (process.argv[4] || 'desktop').toLowerCase();
const sizes = {
  desktop: { width: 1440, height: 1100 },
  mobile: { width: 390, height: 1400 },
};
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: sizes[viewport] || sizes.desktop });
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
await page.goto(url, { waitUntil: 'networkidle' });
await page.waitForTimeout(800);
await page.screenshot({ path: out, fullPage: false });
const memBox = await page.locator('#memorial-mount').boundingBox();
const memText = (await page.locator('#memorial-mount').textContent()) || '';
console.log(JSON.stringify({ out, viewport, memBox, memTextLen: memText.length, errs }, null, 2));
await browser.close();
