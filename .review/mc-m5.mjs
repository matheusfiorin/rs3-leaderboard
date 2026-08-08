import { chromium } from '@playwright/test';
const b = await chromium.launch();
const p = await (await b.newContext({viewport:{width:390,height:844}})).newPage();
await p.goto('http://localhost:4173/rs3-leaderboard/',{waitUntil:'networkidle'}); await p.waitForTimeout(1000);
const r1 = await p.evaluate(() => {
  const all = Array.prototype.slice.call(document.querySelectorAll('a,button'));
  const hit = all.filter(function(e){ return /fiorovizk/i.test(e.textContent || ''); });
  return hit.map(function(e){ var r=e.getBoundingClientRect(); return {tag:e.tagName, href:e.getAttribute('href'), aria:e.getAttribute('aria-label'), w:Math.round(r.width), h:Math.round(r.height)}; });
});
console.log('fiorovizk interactive:', JSON.stringify(r1));
const r2 = await p.evaluate(() => {
  return Array.prototype.slice.call(document.querySelectorAll('h2')).map(function(h){ return {t:h.textContent.trim(), y:Math.round(h.getBoundingClientRect().top + window.scrollY)}; });
});
console.log('sections:', JSON.stringify(r2));
const r3 = await p.evaluate(() => document.querySelector('main').innerText.split('\n').filter(Boolean).slice(0,14));
console.log('first lines:', JSON.stringify(r3));
await b.close();
