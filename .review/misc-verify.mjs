// Confirms the four "misc" defects exist in the CURRENTLY SERVED build, so the
// fixes in v2-src are aimed at the right thing. Run against the pre-change
// build; after a rebuild every line should flip to OK.
import { chromium } from '@playwright/test';

const BASE = 'http://localhost:4173/rs3-leaderboard';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });

const say = (label, bad, detail) =>
  console.log(`${bad ? 'DEFECT PRESENT' : 'ok'}  ${label}${detail ? ' — ' + detail : ''}`);

// --- /live : staleness pill inverted -----------------------------------------
await page.goto(`${BASE}/live/`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1200);
const early = await page.evaluate(() => ({
  pill: document.body.innerText.toLowerCase().includes('last snapshot'),
  err: document.body.innerText.toLowerCase().includes('poll failed'),
}));
say('/live pill shown while awaiting first poll', early.pill && !early.err,
    `pill=${early.pill} error=${early.err}`);

// give the proxies time to fail (each ~10s in the old code)
await page.waitForTimeout(26000);
const late = await page.evaluate(() => {
  const t = document.body.innerText.toLowerCase();
  // the hero is the largest font-size text node on the page
  let hero = null, max = 0;
  for (const el of document.querySelectorAll('div')) {
    if (el.children.length) continue;
    const fs = parseFloat(getComputedStyle(el).fontSize);
    if (fs > max) { max = fs; hero = el; }
  }
  return {
    err: t.includes('poll failed'),
    pill: t.includes('last snapshot') || t.includes('stale snapshot'),
    heroPx: max,
    heroColor: hero && getComputedStyle(hero).color,
  };
});
say('/live pill MISSING while stalled', late.err && !late.pill,
    `error=${late.err} pill=${late.pill} hero=${late.heroPx}px ${late.heroColor}`);

// --- /activity : duplicated hero + stat quad ---------------------------------
await page.goto(`${BASE}/activity/`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(800);
const act = await page.evaluate(() => {
  const t = document.body.innerText;
  const rows = Array.from(document.querySelectorAll('article'));
  const heroLatest = t.toUpperCase().includes('LATEST');
  const firstRow = rows[0]?.innerText || '';
  // does the hero text repeat the first feed row's headline?
  const headline = firstRow.split('\n').find((l) => l.length > 12) || '';
  return {
    heroLatest,
    quadKills: /\bKILLS\b/i.test(t),
    chipBosses: /\bBOSSES\b/i.test(t),
    repeated: heroLatest && headline && t.indexOf(headline) !== t.lastIndexOf(headline),
    headline: headline.slice(0, 50),
  };
});
say('/activity LATEST hero repeats first feed row', Boolean(act.repeated), act.headline);
say('/activity quad says KILLS while chip says BOSSES', act.quadKills && act.chipBosses);

// --- /archive : words in ink-faint -------------------------------------------
await page.goto(`${BASE}/archive/`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(500);
const arch = await page.evaluate(() => {
  const out = [];
  for (const el of document.querySelectorAll('*')) {
    if (el.children.length) continue;
    const txt = (el.textContent || '').trim();
    if (!txt) continue;
    const c = getComputedStyle(el);
    if (/69,\s*75,\s*92|106,\s*114,\s*136/.test(c.color) === false) continue;
    out.push({ txt: txt.slice(0, 28), color: c.color, size: c.fontSize });
  }
  return out;
});
const faint = arch.filter((r) => /69,\s*75,\s*92/.test(r.color));
say('/archive real words rendered in ink-faint', faint.length > 0,
    `${faint.length} nodes, e.g. ${faint.slice(0, 4).map((f) => `"${f.txt}"@${f.size}`).join(', ')}`);

// --- /lookup : silent pending state -----------------------------------------
await page.goto(`${BASE}/lookup/`, { waitUntil: 'domcontentloaded' });
await page.fill('input[type=search]', 'Zezima');
await page.click('button[type=submit]');
await page.waitForTimeout(3000);
const look = await page.evaluate(() => {
  const t = document.body.innerText;
  return {
    text: t.slice(0, 400),
    hasProgress: /relay|proxy \d|attempt/i.test(t),
    submitDisabled: document.querySelector('button[type=submit]')?.disabled ?? null,
    cancel: /cancel/i.test(t),
  };
});
say('/lookup pending state has no progress text', !look.hasProgress);
say('/lookup submit disabled while pending (kills Enter-to-retry)',
    look.submitDisabled === true);
say('/lookup pending state offers no cancel', !look.cancel);

await browser.close();
