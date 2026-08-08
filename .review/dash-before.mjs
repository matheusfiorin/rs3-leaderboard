// Confirms the dashboard findings against the CURRENTLY SERVED build (pre-fix).
import { chromium } from '@playwright/test';
const BASE = 'http://localhost:4173/rs3-leaderboard';
const b = await chromium.launch();

async function at(w, h, mobile) {
  const p = await (await b.newContext({
    viewport: { width: w, height: h },
    isMobile: mobile, hasTouch: mobile, deviceScaleFactor: mobile ? 2 : 1,
  })).newPage();
  await p.goto(BASE + '/', { waitUntil: 'networkidle' });
  await p.waitForTimeout(2000);
  return p;
}

// --- 360: hero stat grid baselines
{
  const p = await at(360, 740, true);
  console.log('=== 360x740');
  console.log('doc scrollWidth', await p.evaluate(() => document.documentElement.scrollWidth));
  console.log(JSON.stringify(await p.evaluate(() => {
    const grid = document.querySelector('main .grid-cols-3');
    if (!grid) return 'no grid-cols-3';
    return [...grid.children].map(c => {
      const lab = c.firstElementChild, val = c.children[1];
      return {
        label: lab.innerText, labelH: Math.round(lab.getBoundingClientRect().height),
        val: val.innerText, valTop: Math.round(val.getBoundingClientRect().top),
        colW: Math.round(c.getBoundingClientRect().width),
        valColor: getComputedStyle(val).color,
      };
    });
  }), null, 1));
  await p.close();
}

// --- 390: what is above the fold, and h2 offsets
{
  const p = await at(390, 844, true);
  console.log('=== 390x844');
  console.log(JSON.stringify(await p.evaluate(() => ({
    h1: [...document.querySelectorAll('main h1')].map(h => h.innerText),
    heads: [...document.querySelectorAll('main h1,main h2')].map(h => ({
      t: h.innerText.replace(/\n/g, ' '), y: Math.round(h.getBoundingClientRect().top + scrollY),
    })),
    aboveFold: [...document.querySelectorAll('main *')]
      .filter(e => e.getBoundingClientRect().top < 844 && e.children.length === 0 && e.innerText?.trim())
      .map(e => e.innerText.trim().slice(0, 40)).slice(0, 25),
  })), null, 1));
  await p.close();
}

// --- 1440: Tonight's board column heights vs content
{
  const p = await at(1440, 900, false);
  console.log('=== 1440x900');
  console.log(JSON.stringify(await p.evaluate(() => {
    const h2 = [...document.querySelectorAll('main h2')].find(h => /Tonight/i.test(h.innerText));
    const grid = h2.closest('section').querySelector('.grid');
    const cards = [...grid.children].map(c => {
      const last = c.lastElementChild;
      return {
        h: Math.round(c.getBoundingClientRect().height),
        w: Math.round(c.getBoundingClientRect().width),
        contentBottom: Math.round(last.getBoundingClientRect().bottom - c.getBoundingClientRect().top),
        text: c.innerText.replace(/\n/g, ' | ').slice(0, 70),
      };
    });
    const hero = document.querySelector('main .lit-edge');
    const big = hero.children[1];
    return {
      cards,
      heroCardW: Math.round(hero.getBoundingClientRect().width),
      bigNumberRight: Math.round(big.getBoundingClientRect().right - hero.getBoundingClientRect().left),
      bigNumberText: big.innerText,
      buttons: document.querySelectorAll('main button').length,
      activityRows: [...document.querySelectorAll('main .divide-y > div')].map(r => r.innerText.replace(/\n/g, ' ~ ')).slice(0, 9),
    };
  }), null, 1));
  await p.close();
}
await b.close();
