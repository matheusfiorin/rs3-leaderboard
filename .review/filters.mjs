import { chromium } from '@playwright/test';
const b = await chromium.launch();
const p = await b.newPage({ viewport:{width:1440,height:900} });
for (const r of ['/money/','/skills/','/pvm/']) {
  await p.goto('http://localhost:4173/rs3-leaderboard'+r, { waitUntil:'networkidle' });
  await p.waitForTimeout(500);
  console.log('=== '+r, await p.evaluate(`(()=>{
    const bs=Array.from(document.querySelectorAll('main button'));
    const names=bs.map(x=>(x.innerText||x.getAttribute('aria-label')||'').trim().replace(/\\s+/g,' '));
    const dupes={}; names.forEach(n=>dupes[n]=(dupes[n]||0)+1);
    return {
      mainButtons: bs.length,
      duplicateNames: Object.entries(dupes).filter(([,c])=>c>1),
      ariaPressed: document.querySelectorAll('main [aria-pressed]').length,
      ariaCurrent: document.querySelectorAll('main [aria-current]').length,
      groups: document.querySelectorAll('main [role="group"], main fieldset, main [role="radiogroup"], main [role="tablist"]').length,
      groupLabels: Array.from(document.querySelectorAll('main [role="group"],main [role="tablist"]')).map(g=>g.getAttribute('aria-label')),
    };
  })()`));
}
await b.close();
