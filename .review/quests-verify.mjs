// Measures the rebuilt /quests table structure (quests-fixture.html) the way
// the reviewers measured the old one: page height, sticky survival deep in the
// list, the xl column split, header/row alignment and the row-wide hit target.
import { chromium } from '@playwright/test';

const URL = 'file://' + '/home/mbaraofiorin/dev/rs3-leaderboard/.review/quests-fixture.html';
const browser = await chromium.launch();

for (const vp of [
  { width: 360, height: 740 },
  { width: 390, height: 844 },
  { width: 768, height: 900 },
  { width: 1440, height: 900 },
  { width: 1920, height: 1080 },
]) {
  const page = await browser.newPage({ viewport: vp });
  await page.goto(URL);
  await page.waitForTimeout(150);

  const before = await page.evaluate(() => {
    const rows = [...document.querySelectorAll('#rows > li')];
    const r0 = rows[0].getBoundingClientRect();
    const r1 = rows[1].getBoundingClientRect();
    const sameRow = Math.abs(r0.top - r1.top) < 2;
    const nameCell = rows[0].firstElementChild.getBoundingClientRect();
    const sticky = document.getElementById('quest-filters').getBoundingClientRect();
    const head2 = document.getElementById('thead2');
    return {
      doc: document.documentElement.scrollHeight,
      hScroll: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      rowH: Math.round(r0.height),
      rowW: Math.round(r0.width),
      twoCols: sameRow,
      nameCellW: Math.round(nameCell.width),
      stickyH: Math.round(sticky.height),
      // header column 2 left edge vs the right-column row left edge
      headerSplit: head2 && head2.offsetParent ? Math.round(head2.getBoundingClientRect().left) : null,
      rowSplit: sameRow ? Math.round(r1.left) : null,
    };
  });

  // Deep scroll: what is still pinned, and does a click in the row's empty
  // middle still hit the wiki link?
  await page.evaluate(() => window.scrollTo(0, 2500));
  await page.waitForTimeout(120);
  const deep = await page.evaluate(() => {
    const pinned = [...document.querySelectorAll('body *')]
      .filter((el) => {
        const cs = getComputedStyle(el);
        if (cs.position !== 'sticky' && cs.position !== 'fixed') return false;
        const b = el.getBoundingClientRect();
        return b.height > 0 && b.bottom > 0 && b.top < window.innerHeight;
      })
      .map((el) => `${el.id || el.tagName} h=${Math.round(el.getBoundingClientRect().height)} @${Math.round(el.getBoundingClientRect().top)}`);

    const rows = [...document.querySelectorAll('#rows > li')];
    const onScreen = rows.find((li) => {
      const b = li.getBoundingClientRect();
      return b.top > 300 && b.bottom < window.innerHeight;
    });
    let hit = null;
    if (onScreen) {
      const b = onScreen.getBoundingClientRect();
      const el = document.elementFromPoint(b.left + b.width * 0.55, b.top + b.height / 2);
      hit = el ? el.tagName + (el.tagName === 'A' ? ' -> ' + el.getAttribute('href') : '') : null;
    }
    let linkBox = null;
    if (onScreen) {
      const a = onScreen.querySelector('a');
      const b = a.getBoundingClientRect();
      linkBox = { w: Math.round(b.width), h: Math.round(b.height) };
    }
    return { pinned, hitAtRowMiddle: hit, linkBox };
  });

  console.log(vp.width + 'x' + vp.height, JSON.stringify({ ...before, ...deep }, null, 1));
  await page.close();
}

await browser.close();
