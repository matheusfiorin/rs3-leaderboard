import { chromium } from '@playwright/test';
const b = await chromium.launch();
const p = await b.newPage({ viewport:{width:1920,height:1080} });
await p.goto('http://localhost:4173/rs3-leaderboard/money',{waitUntil:'networkidle'}); await p.waitForTimeout(800);
console.log(await p.evaluate(()=>{
  const names=['Craft nature runes (Abyss)','Tan red dragonhide','Craft cosmic runes (Abyss)','Barrows runs','Fort Forinthry stone wall segments','Tan cowhide','Player-owned farm','Craft mist runes','Cut rubies'];
  const out=[];
  document.querySelectorAll('*').forEach(e=>{
    if(e.children.length) return;
    const t=e.textContent.trim();
    if(!names.includes(t)) return;
    const r=e.getBoundingClientRect();
    if(r.y<800) return;
    out.push({t, x:Math.round(r.x), y:Math.round(r.y)});
  });
  return out.slice(0,12);
}));
await b.close();
