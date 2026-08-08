import { chromium } from '@playwright/test';
const BASE = 'http://localhost:4173/rs3-leaderboard';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });

// gear upgrade rows: content right edge vs card right edge
await p.goto(BASE + '/gear', { waitUntil: 'networkidle' }); await p.waitForTimeout(500);
const gear = await p.evaluate(() => {
  const h = [...document.querySelectorAll('h2')].find(x => /next upgrades/i.test(x.textContent));
  let n = h.parentElement;
  while (n && !n.querySelector('li,article')) n = n.nextElementSibling;
  const grid = h.closest('section') || document.body;
  const rows = [...grid.querySelectorAll('li,article')].slice(0, 5);
  return rows.map(r => {
    const rb = r.getBoundingClientRect();
    let maxTextRight = 0, ringLeft = Infinity;
    r.querySelectorAll('*').forEach(e => {
      if (e.children.length) return;
      const t = e.textContent.trim(); if (!t) return;
      const g = e.getBoundingClientRect(); if (!g.width) return;
      if (/^\d+$/.test(t) && g.left > rb.left + rb.width * 0.7) { ringLeft = Math.min(ringLeft, g.left); return; }
      maxTextRight = Math.max(maxTextRight, g.right);
    });
    return { cardW: Math.round(rb.width), left: Math.round(rb.left), textRight: Math.round(maxTextRight),
      ringLeft: ringLeft === Infinity ? null : Math.round(ringLeft),
      gap: ringLeft === Infinity ? null : Math.round(ringLeft - maxTextRight) };
  });
});
console.log('GEAR upgrade rows:', JSON.stringify(gear, null, 1));

// gear full ladder table column widths
const cols = await p.evaluate(() => {
  const th = [...document.querySelectorAll('th')];
  return th.map(t => ({ h: t.innerText.trim(), w: Math.round(t.getBoundingClientRect().width) }));
});
console.log('TABLE cols:', JSON.stringify(cols));

// dungeons boilerplate repetition
await p.goto(BASE + '/dungeons', { waitUntil: 'networkidle' }); await p.waitForTimeout(500);
const rep = await p.evaluate(() => {
  const txt = document.body.innerText;
  const count = (s) => txt.split(s).length - 1;
  return {
    gearFloorNote: count('not a difficulty band'),
    prepNote: count('tracked by hand, shared across players'),
    recNote: count('the game does not check these'),
    storyMode: count('Story mode halves enemy HP'),
  };
});
console.log('DUNGEONS repetition:', JSON.stringify(rep));

// pvm card interior: description measure + dead space in Kills row
await p.goto(BASE + '/pvm', { waitUntil: 'networkidle' }); await p.waitForTimeout(500);
const pvm = await p.evaluate(() => {
  const cards = [...document.querySelectorAll('article,li')].filter(e => /Kills/.test(e.innerText)).slice(0, 4);
  return cards.map(c => {
    const r = c.getBoundingClientRect();
    const lbl = [...c.querySelectorAll('*')].find(e => e.children.length === 0 && e.textContent.trim() === 'Kills');
    const lr = lbl?.getBoundingClientRect();
    const inp = c.querySelector('input');
    const ir = inp?.getBoundingClientRect();
    return { cardW: Math.round(r.width), killsLabelRight: lr ? Math.round(lr.right - r.left) : null,
      inputLeft: ir ? Math.round(ir.left - r.left) : null,
      voidPx: lr && ir ? Math.round(ir.left - lr.right) : null };
  });
});
console.log('PVM kills row void:', JSON.stringify(pvm));

// dungeon ring label
await p.goto(BASE + '/dungeons', { waitUntil: 'networkidle' }); await p.waitForTimeout(500);
const ring = await p.evaluate(() => {
  const svgs = [...document.querySelectorAll('svg')].slice(0, 12);
  return svgs.map(s => ({ aria: s.getAttribute('aria-label'), role: s.getAttribute('role'),
    txt: s.parentElement?.innerText?.replace(/\n/g,' ').slice(0,20), title: s.querySelector('title')?.textContent })).slice(0,10);
});
console.log('rings:', JSON.stringify(ring));
await b.close();
