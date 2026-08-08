import { chromium } from '@playwright/test';
const B='http://localhost:4173/rs3-leaderboard';
const b = await chromium.launch();
const p = await (await b.newContext({viewport:{width:390,height:844}})).newPage();
await p.goto(B+'/quests',{waitUntil:'networkidle'}); await p.waitForTimeout(1000);
console.log(await p.evaluate(()=>{
  const a=[...document.querySelectorAll('a[href*="runescape.wiki"]')];
  const s=a[5];
  const cs=getComputedStyle(s);
  return {count:a.length, target:s.target, rel:s.rel, deco:cs.textDecorationLine, color:cs.color, hasIcon:s.querySelector('svg')!==null, aria:s.getAttribute('aria-label'), h:Math.round(s.getBoundingClientRect().height)};
}));
// back to top / scroll affordance?
await p.evaluate(()=>window.scrollTo(0,28000)); await p.waitForTimeout(600);
console.log('fixed elements while deep-scrolled', await p.evaluate(()=>[...document.querySelectorAll('*')].filter(e=>{const cs=getComputedStyle(e); return (cs.position==='fixed'||cs.position==='sticky') && e.getBoundingClientRect().height>10;}).map(e=>({tag:e.tagName, cls:e.className.toString().slice(0,50), pos:getComputedStyle(e).position, r:JSON.stringify(e.getBoundingClientRect().toJSON())}))));
await p.screenshot({path:'/home/mbaraofiorin/dev/rs3-leaderboard/.review/shots/mobile-core/int-quests-deep.png'});
// row heights
console.log('row metrics', await p.evaluate(()=>{
  const li=[...document.querySelectorAll('li')].filter(l=>l.querySelector('a[href*="runescape.wiki"]'));
  const r=li[10].getBoundingClientRect();
  return {rows:li.length, rowH:Math.round(r.height), listPx:li.length*Math.round(r.height)};
}));
await b.close();
