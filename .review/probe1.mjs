import { chromium } from '@playwright/test';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width:1440, height:900 } });
await p.goto('http://localhost:4173/rs3-leaderboard/quests', { waitUntil:'networkidle' });
await p.waitForTimeout(1500);
const info = await p.evaluate(() => {
  const out = { doc: document.documentElement.scrollHeight, body: document.body.scrollHeight };
  // find tallest elements
  const els = [...document.querySelectorAll('*')].map(e => {
    const r = e.getBoundingClientRect();
    return { tag: e.tagName, cls: (e.className||'').toString().slice(0,80), top: Math.round(r.top+window.scrollY), h: Math.round(r.height), bottom: Math.round(r.bottom+window.scrollY) };
  }).filter(e => e.h > 2000).sort((a,b)=>b.h-a.h).slice(0,20);
  out.tall = els;
  // deepest bottom
  const all = [...document.querySelectorAll('*')].map(e => { const r=e.getBoundingClientRect(); return {cls:(e.className||'').toString().slice(0,60), tag:e.tagName, bottom: Math.round(r.bottom+window.scrollY), h:Math.round(r.height)};}).sort((a,b)=>b.bottom-a.bottom).slice(0,15);
  out.deepest = all;
  return out;
});
console.log(JSON.stringify(info, null, 2));
await p.screenshot({ path: '.review/shots/desktop-core/quests-top.png' });
await b.close();
