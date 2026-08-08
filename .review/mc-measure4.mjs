import { chromium } from '@playwright/test';
const b = await chromium.launch();
const p = await (await b.newContext({viewport:{width:390,height:844}})).newPage();
await p.goto('http://localhost:4173/rs3-leaderboard/',{waitUntil:'networkidle'}); await p.waitForTimeout(1000);
console.log(await p.evaluate(()=>{
  const el=[...document.querySelectorAll('*')].find(e=>e.children.length===0 && /Fiorovizk/i.test(e.textContent||''));
  const w=el.closest('a,button');
  if(!el) return 'not found'; return {tag:el.tagName, wrapper:w?w.tagName+' href='+(w.getAttribute('href')||'')+' aria='+w.getAttribute('aria-label'):null, size:JSON.stringify(el.getBoundingClientRect().toJSON())};
}));
// what is above the fold (844px)?
console.log('above fold text', await p.evaluate(()=>{
  const out=[]; const walk=(n)=>{ if(n.nodeType===3 && n.textContent.trim()){ const r=n.parentElement.getBoundingClientRect(); if(r.top<844) out.push(n.textContent.trim()); } n.childNodes.forEach(walk); };
  walk(document.querySelector('main'));
  return out;
}));
// head-to-head position
console.log('h2 offsets', await p.evaluate(()=>[...document.querySelectorAll('h2')].map(h=>({t:h.textContent.trim(), y:Math.round(h.getBoundingClientRect().top+window.scrollY)}))));
await b.close();
