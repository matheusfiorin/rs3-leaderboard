import { chromium } from '@playwright/test';
const b = await chromium.launch();
const p = await b.newPage({ viewport:{width:1920,height:1080} });
await p.goto('http://localhost:4173/rs3-leaderboard/money',{waitUntil:'networkidle'}); await p.waitForTimeout(700);
console.log(await p.evaluate(()=>[...document.querySelectorAll('h4,h3')].slice(0,14).map(h=>({t:h.textContent.slice(0,34), x:Math.round(h.getBoundingClientRect().x)}))));
await b.close();
