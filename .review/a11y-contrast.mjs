import { chromium } from '@playwright/test';
const BASE = 'http://localhost:4173/rs3-leaderboard';
const routes = ['/', '/skills', '/pvm', '/money', '/settings', '/quests'];
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

const CONTRAST = `
function lin(c){c/=255;return c<=0.04045?c/12.92:Math.pow((c+0.055)/1.055,2.4);}
function lum(rgb){return 0.2126*lin(rgb[0])+0.7152*lin(rgb[1])+0.0722*lin(rgb[2]);}
function parse(s){const m=s.match(/rgba?\\(([^)]+)\\)/);if(!m)return null;const p=m[1].split(',').map(Number);return p;}
function effBg(el){
  let n=el;
  while(n && n!==document.documentElement){
    const bg=getComputedStyle(n).backgroundColor;const p=parse(bg);
    if(p && (p[3]===undefined || p[3]>0.95)) return p.slice(0,3);
    if(p && p[3]>0){ /* blend over parent later; approximate by continuing */ }
    n=n.parentElement;
  }
  return [6,8,15];
}
function ratio(a,b){const la=lum(a),lb=lum(b);const hi=Math.max(la,lb),lo=Math.min(la,lb);return (hi+0.05)/(lo+0.05);}
`;

for (const r of routes) {
  await page.goto(BASE + r, { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  const out = await page.evaluate(new Function(CONTRAST + `
    const res = {};
    const els = Array.from(document.querySelectorAll('*')).filter(el => {
      const kids = Array.from(el.childNodes).filter(n=>n.nodeType===3 && n.textContent.trim());
      return kids.length>0;
    });
    for (const el of els) {
      const cs = getComputedStyle(el);
      const col = parse(cs.color); if(!col) continue;
      const hex = '#'+col.slice(0,3).map(v=>v.toString(16).padStart(2,'0')).join('').toUpperCase();
      if (!['#6B7388','#454B5C'].includes(hex)) continue;
      const bg = effBg(el);
      const cr = ratio(col.slice(0,3), bg);
      const fs = parseFloat(cs.fontSize); const fw = cs.fontWeight;
      const large = (fs>=24) || (fs>=18.66 && Number(fw)>=700);
      const txt = el.textContent.trim().replace(/\\s+/g,' ').slice(0,54);
      const key = hex+'|'+fs+'px|'+cr.toFixed(2);
      res[key] = res[key] || {count:0, samples:[], large, bgHex:'#'+bg.map(v=>v.toString(16).padStart(2,'0')).join('').toUpperCase()};
      res[key].count++;
      if(res[key].samples.length<4) res[key].samples.push(txt);
    }
    return res;
  `));
  console.log('=== ' + r);
  for (const [k, v] of Object.entries(out)) {
    console.log('  ' + k + ' on ' + v.bgHex + '  x' + v.count + (v.large?' [LARGE]':'') + '  :: ' + v.samples.join(' | '));
  }
}
await browser.close();
