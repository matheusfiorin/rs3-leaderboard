import { chromium, devices } from '@playwright/test';
import fs from 'node:fs';
const BASE = 'http://localhost:4173/rs3-leaderboard';
const OUT = '.review/shots/mobile-endgame/interact';
fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1, userAgent: devices['iPhone 13'].userAgent, reducedMotion: 'reduce' });
const p = await ctx.newPage();
p.on('console', (m) => { if (m.type() === 'error') console.log('CONSOLE ERROR:', m.text()); });
const shot = (n) => p.screenshot({ path: `${OUT}/${n}.png` });
const state = () => p.evaluate(() => ({
  h: document.documentElement.scrollHeight,
  kills: document.querySelectorAll('input[aria-label="Kills"]').length,
  visKills: [...document.querySelectorAll('input[aria-label="Kills"]')].filter((e) => e.offsetParent !== null).length,
  sections: [...document.querySelectorAll('h3')].map((x) => x.innerText.replace(/\n/g, ' ')),
  chipStates: [...document.querySelectorAll('button')].filter((x) => /^(ALL|EARLY|MID|LATE|END|APEX|ANY|SOLO|DUO|GROUP)/.test(x.innerText.trim())).map((x) => x.innerText.replace(/\n/g, '') + ':' + getComputedStyle(x).backgroundColor),
}));
const clickText = async (re) => {
  const el = p.locator('button').filter({ hasText: re }).first();
  await el.scrollIntoViewIfNeeded();
  await el.click();
  await p.waitForTimeout(700);
};

await p.goto(BASE + '/pvm/', { waitUntil: 'networkidle' });
await p.waitForTimeout(1000);
console.log('BASE', JSON.stringify(await state()));
await clickText(/^APEX/);
console.log('APEX', JSON.stringify(await state()));
await p.evaluate(() => window.scrollTo(0, 700)); await p.waitForTimeout(400);
await shot('pvm-apex');
await clickText(/^ALL/);
console.log('ALL ', JSON.stringify(await state()));
await clickText(/^GROUP/);
console.log('GROUP', JSON.stringify(await state()));
await p.evaluate(() => window.scrollTo(0, 700)); await p.waitForTimeout(400);
await shot('pvm-group');
await clickText(/^ANY/);
const ro = p.locator('button').filter({ hasText: /READY ONLY/ }).first();
await ro.scrollIntoViewIfNeeded(); await ro.click(); await p.waitForTimeout(700);
console.log('READYONLY', JSON.stringify(await state()));
await p.evaluate(() => window.scrollTo(0, 700)); await p.waitForTimeout(400);
await shot('pvm-readyonly');
await b.close();
