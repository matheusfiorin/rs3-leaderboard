// Confirms the two /dungeons findings against the CURRENTLY SERVED build
// (which predates my change), so I can be sure I fixed the right thing.
// After the central rebuild, re-run: repetition total should fall to <= 4
// (one legend), rungs should carry no far-right level token, and h1 == 1.
import { chromium } from '@playwright/test';

const URL = 'http://localhost:4173/rs3-leaderboard/dungeons';
const b = await chromium.launch();

// --- 1440: boilerplate repetition, h1, scroll height -----------------------
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.goto(URL, { waitUntil: 'networkidle' });
await p.waitForTimeout(600);

const phrases = [
  'not a difficulty band',
  'halves enemy HP',
  'tracked by hand',
  'the game does not check these',
];
const rep = await p.evaluate((ph) => {
  const t = document.body.innerText;
  const out = {};
  let total = 0;
  for (const s of ph) {
    const n = t.split(s).length - 1;
    out[s] = n;
    total += n;
  }
  return { out, total };
}, phrases);
console.log('REPEATED EXPLAINERS', JSON.stringify(rep.out), 'total =', rep.total);
console.log('h1 count =', await p.locator('h1').count());
console.log('page scrollHeight =', await p.evaluate(() => document.body.scrollHeight));

// --- necro rungs: duplicate level token + horizontal void ------------------
const rungs = await p.evaluate(() => {
  // Ladder rungs are the only <li> with a 36px round rail node.
  const lis = [...document.querySelectorAll('ol > li')].filter((li) =>
    li.querySelector(':scope > span.rounded-full.h-9, :scope > span.h-9.rounded-full'),
  );
  return lis.slice(0, 4).map((li) => {
    const r = li.getBoundingClientRect();
    const node = li.querySelector('span.rounded-full');
    // last inline tabular token in the row
    const tab = [...li.querySelectorAll('span.tabular')];
    const last = tab[tab.length - 1];
    const blurb = li.querySelector('p');
    return {
      h: Math.round(r.height),
      w: Math.round(r.width),
      railNode: node?.innerText?.trim(),
      lastToken: last?.innerText?.trim(),
      lastTokenX: last ? Math.round(last.getBoundingClientRect().x) : null,
      blurbEndsAt: blurb ? Math.round(blurb.getBoundingClientRect().right) : null,
      rowRight: Math.round(r.right),
    };
  });
});
console.log('RUNGS', JSON.stringify(rungs, null, 1));
console.log(
  'ladder li count =',
  await p.evaluate(() => document.querySelectorAll('ol > li').length),
);
await p.close();

// --- 360: horizontal overflow ---------------------------------------------
const m = await b.newPage({ viewport: { width: 360, height: 800 } });
await m.goto(URL, { waitUntil: 'networkidle' });
await m.waitForTimeout(400);
console.log(
  'overflow px @360 =',
  await m.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  ),
);
await m.close();
await b.close();
