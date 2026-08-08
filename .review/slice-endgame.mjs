import { chromium, devices } from '@playwright/test';
import fs from 'node:fs';

const BASE = 'http://localhost:4173/rs3-leaderboard';
const route = process.argv[2];
const outDir = process.argv[3];
const maxSlices = Number(process.argv[4] || 12);
const startIdx = Number(process.argv[5] || 0);
const step = Number(process.argv[6] || 720);

fs.mkdirSync(outDir, { recursive: true });
const b = await chromium.launch();
const ctx = await b.newContext({
  viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true,
  deviceScaleFactor: 1, userAgent: devices['iPhone 13'].userAgent, reducedMotion: 'reduce',
});
const p = await ctx.newPage();
await p.goto(BASE + route + '/', { waitUntil: 'networkidle' });
await p.waitForTimeout(1200);
const h = await p.evaluate(() => document.documentElement.scrollHeight);
const name = route.replace(/\//g, '') || 'home';
for (let i = 0; i < maxSlices; i++) {
  const y = (startIdx + i) * step;
  if (y > h) break;
  await p.evaluate((y) => window.scrollTo(0, y), y);
  await p.waitForTimeout(300);
  await p.screenshot({ path: `${outDir}/${name}-${String(startIdx + i).padStart(2, '0')}.png` });
}
console.log(`${route} height=${h}`);
await b.close();
