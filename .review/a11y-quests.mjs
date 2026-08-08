import { chromium } from '@playwright/test';
const BASE = 'http://localhost:4173/rs3-leaderboard';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto(BASE + '/quests/', { waitUntil: 'networkidle' });
await page.waitForTimeout(600);

const r = await page.evaluate(() => {
  const as = Array.from(document.querySelectorAll('a[href^="https://runescape.wiki"]'));
  const sample = as.slice(0, 3).map(a => ({
    innerText: a.innerText, textContent: a.textContent,
    visible: !!a.offsetParent, rect: a.getBoundingClientRect().toJSON(),
    parentHidden: getComputedStyle(a.parentElement).display,
    outer: a.outerHTML.slice(0, 300),
  }));
  return { count: as.length, sample };
});
console.log(JSON.stringify(r, null, 1));

// accessibility tree snapshot of one quest row
const snap = await page.accessibility.snapshot({ interestingOnly: true });
function walk(n, d = 0, out = []) {
  if (d > 6) return out;
  out.push('  '.repeat(d) + n.role + ' "' + (n.name || '') + '"');
  (n.children || []).slice(0, 12).forEach(c => walk(c, d + 1, out));
  return out;
}
console.log(walk(snap).slice(0, 70).join('\n'));
await browser.close();
