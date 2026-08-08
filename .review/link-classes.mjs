import { chromium, devices } from '@playwright/test';
const b = await chromium.launch();
const c = await b.newContext({ viewport:{width:390,height:844}, isMobile:true, hasTouch:true, userAgent: devices['iPhone 13'].userAgent });
const p = await c.newPage();
for (const route of ['/goals','/pvm','/gear']) {
  await p.goto('http://localhost:4173/rs3-leaderboard'+route+'/', { waitUntil:'domcontentloaded' });
  await p.waitForTimeout(1200);
  const out = await p.evaluate(() => {
    const m = {};
    for (const a of document.querySelectorAll('a')) {
      const r = a.getBoundingClientRect();
      if (r.height === 0 || r.height >= 24) continue;
      const k = (typeof a.className==='string'?a.className:'').slice(0,90);
      m[k] = (m[k]||0)+1;
    }
    return m;
  });
  console.log('\n'+route);
  Object.entries(out).sort((x,y)=>y[1]-x[1]).slice(0,4).forEach(([k,n])=>console.log(`  ${n}x  ${k}`));
}
await b.close();
