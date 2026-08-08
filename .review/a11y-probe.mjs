import { chromium } from '@playwright/test';

const BASE = 'http://localhost:4173/rs3-leaderboard';
const routes = ['/', '/skills', '/pvm', '/money', '/settings', '/quests'];

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

for (const r of routes) {
  await page.goto(BASE + r, { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);

  const info = await page.evaluate(() => {
    const q = (s) => Array.from(document.querySelectorAll(s));
    // skip link candidates: first focusable in DOM
    const focusables = q('a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])')
      .filter(el => !el.hasAttribute('disabled') && el.offsetParent !== null || el.tagName === 'A');
    const first5 = focusables.slice(0, 6).map(el => ({
      tag: el.tagName,
      text: (el.innerText || el.value || '').trim().slice(0, 40),
      href: el.getAttribute('href'),
      aria: el.getAttribute('aria-label'),
      cls: (el.className || '').toString().slice(0, 80),
    }));
    const landmarks = q('main, nav, header, footer, aside, [role="main"], [role="navigation"], [role="banner"]')
      .map(el => el.tagName + (el.id ? '#' + el.id : '') + (el.getAttribute('aria-label') ? '[' + el.getAttribute('aria-label') + ']' : ''));
    const h1 = q('h1').map(e => e.innerText.trim());
    // controls with no accessible name
    const unnamed = q('button, a[href], input, select, textarea').filter(el => {
      const txt = (el.innerText || '').trim();
      const al = el.getAttribute('aria-label');
      const alb = el.getAttribute('aria-labelledby');
      const title = el.getAttribute('title');
      const id = el.id;
      const lbl = id ? document.querySelector(`label[for="${id}"]`) : null;
      const inLabel = el.closest('label');
      const ph = el.getAttribute('placeholder');
      return !txt && !al && !alb && !title && !lbl && !inLabel && !ph;
    }).map(el => ({ tag: el.tagName, cls: (el.className||'').toString().slice(0,70), html: el.outerHTML.slice(0, 130) }));
    // inputs specifically lacking a real label (placeholder doesn't count)
    const inputsNoLabel = q('input, textarea, select').filter(el => {
      const al = el.getAttribute('aria-label') || el.getAttribute('aria-labelledby');
      const lbl = el.id ? document.querySelector(`label[for="${el.id}"]`) : null;
      return !al && !lbl && !el.closest('label');
    }).map(el => ({ tag: el.tagName, type: el.type, ph: el.getAttribute('placeholder'), cls: (el.className||'').toString().slice(0,60) }));
    // count aria-expanded usage
    const collapsibles = q('[aria-expanded]').length;
    const detailsEls = q('details').length;
    const clickableDivs = q('div[onclick], div[role="button"], span[role="button"]').length;
    return { first5, landmarks, h1, unnamed, inputsNoLabel, collapsibles, detailsEls, clickableDivs,
             tabIndexPositive: q('[tabindex]').map(e=>e.getAttribute('tabindex')).filter(v=>Number(v)>0).length };
  });
  console.log('=== ' + r);
  console.log(JSON.stringify(info, null, 1));
}
await browser.close();
