import { chromium, devices } from '@playwright/test';
const BASE = 'http://localhost:4173/rs3-leaderboard';
const OUT = '/home/mbaraofiorin/dev/rs3-leaderboard/.review/shots/mobile-endgame/interact';
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1, userAgent: devices['iPhone 13'].userAgent, reducedMotion: 'reduce' });
const p = await ctx.newPage();
for (const r of ['/pvm', '/gear', '/capes', '/dungeons']) {
  await p.goto(BASE + r + '/', { waitUntil: 'networkidle' });
  await p.waitForTimeout(900);
  const info = await p.evaluate(() => {
    const sticky = [...document.querySelectorAll('*')].filter((e) => ['sticky', 'fixed'].includes(getComputedStyle(e).position)).map((e) => getComputedStyle(e).position + ':' + (e.className?.toString().slice(0, 50)) + ':' + e.innerText?.replace(/\n/g, '~').slice(0, 40));
    return sticky;
  });
  console.log('===', r, JSON.stringify(info, null, 1));
}
// full ladder card content on gear
await p.goto(BASE + '/gear/', { waitUntil: 'networkidle' }); await p.waitForTimeout(900);
const ladder = await p.evaluate(() => {
  const h = [...document.querySelectorAll('h2')].find((x) => /Full ladder/i.test(x.innerText));
  let node = h.parentElement;
  while (node && node.innerText.length < 1500) node = node.parentElement;
  return node.innerText.split('\n').slice(0, 40);
});
console.log('GEAR ladder sample:', JSON.stringify(ladder, null, 1));
// what does the pvm ring number mean
await p.goto(BASE + '/pvm/', { waitUntil: 'networkidle' }); await p.waitForTimeout(900);
const rings = await p.evaluate(() => [...document.querySelectorAll('svg')].slice(0, 6).map((s) => s.parentElement.innerText.replace(/\n/g, '~').slice(0, 50)));
console.log('PVM rings:', JSON.stringify(rings));
const legend = await p.evaluate(() => /%|percent|ready/i.test(document.body.innerText.slice(0, 1200)) ? document.body.innerText.slice(0, 1200).replace(/\n/g, ' | ') : 'no');
console.log('PVM top text:', legend);
await b.close();
