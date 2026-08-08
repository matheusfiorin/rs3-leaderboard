import { chromium } from '@playwright/test';
const b = await chromium.launch();
const p = await b.newPage({ viewport:{width:1440,height:900} });
await p.goto('http://localhost:4173/rs3-leaderboard/quests/', { waitUntil:'networkidle' });
await p.waitForTimeout(600);
console.log(await p.evaluate(`(()=>{
  const els=Array.from(document.querySelectorAll('*')).filter(e=>e.children.length===0 && ['D','S'].includes(e.textContent.trim()));
  return els.slice(0,4).map(e=>{const cs=getComputedStyle(e);const anc=(()=>{let n=e;while(n){if(['BUTTON','A','SUMMARY'].includes(n.tagName))return n.tagName+'|'+(n.getAttribute('aria-label')||n.getAttribute('title')||'(no name)')+'|pressed='+n.getAttribute('aria-pressed');n=n.parentElement;}return 'NONE';})();
   const r=e.getBoundingClientRect();
   return {tag:e.tagName,text:e.textContent.trim(),color:cs.color,fs:cs.fontSize,borderColor:cs.borderColor,w:Math.round(r.width),h:Math.round(r.height),interactiveAncestor:anc, outer:e.outerHTML.slice(0,180)};});
})()`));
// keyboard: can you toggle a D/S badge?
const btns = p.locator('button[aria-pressed]');
console.log('aria-pressed buttons:', await btns.count());
await b.close();
