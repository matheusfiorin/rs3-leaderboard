import { chromium } from '@playwright/test';
const url = process.argv[2] || 'http://localhost:8080/';
const outDir = process.argv[3] || '/tmp/bp';
import { mkdir } from 'node:fs/promises';
await mkdir(outDir, { recursive: true });
const sizes = [
  { w: 320, h: 700, name: '320-small-phone' },
  { w: 375, h: 812, name: '375-iphone-se' },
  { w: 390, h: 844, name: '390-iphone-14' },
  { w: 480, h: 900, name: '480-large-phone' },
  { w: 640, h: 1024, name: '640-small-tablet' },
  { w: 768, h: 1024, name: '768-tablet' },
  { w: 1024, h: 1100, name: '1024-small-laptop' },
  { w: 1280, h: 1100, name: '1280-desktop' },
  { w: 1440, h: 1100, name: '1440-large-desktop' },
];
const browser = await chromium.launch();
const reports = [];
for (const s of sizes) {
  const ctx = await browser.newContext({ viewport: { width: s.w, height: s.h }, hasTouch: s.w <= 768 });
  const page = await ctx.newPage();
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${outDir}/${s.name}.png`, fullPage: false });
  await page.screenshot({ path: `${outDir}/${s.name}-full.png`, fullPage: true });
  const metrics = await page.evaluate(() => {
    const memBox = document.getElementById('memorial-mount')?.getBoundingClientRect();
    const mcBox = document.getElementById('mission-control')?.getBoundingClientRect();
    const mgBox = document.getElementById('major-goals')?.getBoundingClientRect();
    const dockBox = document.querySelector('.dock')?.getBoundingClientRect();
    const docH = document.documentElement.scrollHeight;
    const docW = document.documentElement.scrollWidth;
    const overflowX = docW > window.innerWidth;
    return {
      memH: memBox?.height,
      mcH: mcBox?.height,
      mgH: mgBox?.height,
      dockH: dockBox?.height,
      docH, docW, overflowX,
    };
  });
  reports.push({ size: s.name, vw: s.w, ...metrics });
  await ctx.close();
}
console.log(JSON.stringify(reports, null, 2));
await browser.close();
