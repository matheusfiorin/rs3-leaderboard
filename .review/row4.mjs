import { chromium } from '@playwright/test';
const b = await chromium.launch();
const p = await b.newPage({ viewport:{width:1440,height:900} });
await p.goto('http://localhost:4173/rs3-leaderboard/quests/', { waitUntil:'networkidle' });
await p.waitForTimeout(600);
console.log(await p.evaluate(`(()=>{
  const li=Array.from(document.querySelectorAll('li')).find(l=>l.querySelector('a[href*="runescape.wiki"]') && l.className.includes('grid-cols'));
  const h=li.outerHTML.replace(/\\s+/g,' ');
  return { tail: h.slice(-800), qpAndDS: h.match(/<span[^>]*text-ink-faint[^>]*>[\\s\\S]{0,60}?<\\/span>/g)||[] };
})()`));
await b.close();
