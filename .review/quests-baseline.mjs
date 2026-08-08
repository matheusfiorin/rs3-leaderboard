// Baseline measurement of the CURRENT (pre-fix) build of /quests, so the fix
// can be reasoned against real numbers: page height, row height, whether the
// search/filter block survives a scroll, and the wiki-link hit box.
import { chromium } from '@playwright/test';

const BASE = 'http://localhost:4173/rs3-leaderboard';
const browser = await chromium.launch();

for (const vp of [{ width: 360, height: 740 }, { width: 1440, height: 900 }]) {
  const page = await browser.newPage({ viewport: vp });
  await page.goto(BASE + '/quests/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(700);

  const r = await page.evaluate(() => {
    const ul = document.querySelector('ul + ul, ul');
    const lists = Array.from(document.querySelectorAll('ul'));
    const table = lists[lists.length - 1];
    const rows = Array.from(table.children);
    const h = rows.map((li) => Math.round(li.getBoundingClientRect().height));
    const searchWrap = document.querySelector('input[type=search]')?.closest('div');
    const header = Array.from(document.querySelectorAll('div')).find(
      (d) => d.textContent?.trim().startsWith('Quest') && d.className.includes('sm:grid'),
    );
    const link = table.querySelector('a[href^="https://runescape.wiki"]');
    return {
      doc: document.documentElement.scrollHeight,
      rowCount: rows.length,
      rowHeights: [...new Set(h)].sort((a, b) => a - b),
      searchTop: searchWrap ? Math.round(searchWrap.getBoundingClientRect().top + window.scrollY) : null,
      searchPosition: searchWrap ? getComputedStyle(searchWrap).position : null,
      headerPosition: header ? getComputedStyle(header).position : null,
      containIntrinsic: rows[0] ? getComputedStyle(rows[0]).containIntrinsicSize : null,
      linkBox: link ? (({ width, height }) => ({ width: Math.round(width), height: Math.round(height) }))(link.getBoundingClientRect()) : null,
      hasShowMore: Array.from(document.querySelectorAll('button')).some((b) =>
        /more|load|show all|next/i.test(b.textContent || ''),
      ),
      h1: Array.from(document.querySelectorAll('h1')).map((n) => n.textContent),
    };
  });

  // What is still pinned once you are deep in the list?
  await page.evaluate(() => window.scrollTo(0, 15000));
  await page.waitForTimeout(400);
  const pinned = await page.evaluate(() => {
    const out = [];
    for (const el of document.querySelectorAll('body *')) {
      const cs = getComputedStyle(el);
      if (cs.position !== 'sticky' && cs.position !== 'fixed') continue;
      const b = el.getBoundingClientRect();
      if (b.height === 0 || b.bottom < 0 || b.top > window.innerHeight) continue;
      out.push(`${el.tagName}.${(el.className || '').toString().slice(0, 28)} ${Math.round(b.height)}px @${Math.round(b.top)}`);
    }
    return out;
  });

  console.log(vp.width + 'px', JSON.stringify({ ...r, pinnedAt15000: pinned }, null, 1));
  await page.close();
}

await browser.close();
