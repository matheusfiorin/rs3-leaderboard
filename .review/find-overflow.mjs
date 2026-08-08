import { chromium, devices } from '@playwright/test';
const b = await chromium.launch();
const c = await b.newContext({ viewport:{width:390,height:844}, isMobile:true, hasTouch:true, userAgent: devices['iPhone 13'].userAgent });
const p = await c.newPage();
await p.goto('http://localhost:4173/rs3-leaderboard/pvm/', { waitUntil:'domcontentloaded' });
await p.waitForTimeout(1500);
const out = await p.evaluate(() => {
  const W = document.documentElement.clientWidth;
  let worst=null, worstR=-1;
  for (const el of document.body.querySelectorAll('*')) {
    const r = el.getBoundingClientRect();
    if (r.width>0 && r.right > worstR) { worstR=r.right; worst=el; }
  }
  const chain=[]; let n=worst;
  while(n && n!==document.documentElement){
    const r=n.getBoundingClientRect(); const cs=getComputedStyle(n);
    chain.push({tag:n.tagName.toLowerCase(), cls:(typeof n.className==='string'?n.className:'').slice(0,100),
      w:Math.round(r.width), l:Math.round(r.left), r:Math.round(r.right), minW:cs.minWidth, d:cs.display});
    n=n.parentElement;
  }
  return {W, worstR:Math.round(worstR), chain};
});
console.log('doc', out.W, 'worst right', out.worstR);
out.chain.forEach(c=>console.log(` ${c.tag.padEnd(7)} w=${String(c.w).padStart(5)} l=${String(c.l).padStart(4)} r=${String(c.r).padStart(5)} minW=${c.minW} ${c.d}\n     ${c.cls}`));
await b.close();
