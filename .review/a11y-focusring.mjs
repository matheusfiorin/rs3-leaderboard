import { chromium } from '@playwright/test';
const BASE = 'http://localhost:4173/rs3-leaderboard';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto(BASE + '/skills/', { waitUntil: 'networkidle' });
await page.waitForTimeout(400);

console.log(await page.evaluate(`(() => {
  const root = getComputedStyle(document.documentElement);
  return {
    prayerBright: root.getPropertyValue('--color-prayer-bright'),
    ink3: root.getPropertyValue('--color-ink-3'),
    layerOrder: Array.from(document.styleSheets).length,
  };
})()`));

// focus the dim refresh button and the dim COMBAT chip, screenshot both
const btn = page.locator('button[aria-label="Refresh data"]');
await btn.focus();
console.log('refresh btn ring:', await btn.evaluate(e => {
  const cs = getComputedStyle(e);
  return { color: cs.color, outlineColor: cs.outlineColor, outlineWidth: cs.outlineWidth, outlineStyle: cs.outlineStyle };
}));
await page.screenshot({ path: '.review/shots/a11y/ring-refresh.png', clip: { x: 1150, y: 0, width: 290, height: 60 } });

const chip = page.getByRole('button', { name: 'COMBAT', exact: true });
await chip.focus();
console.log('COMBAT chip ring:', await chip.evaluate(e => {
  const cs = getComputedStyle(e);
  return { color: cs.color, outlineColor: cs.outlineColor };
}));
await page.screenshot({ path: '.review/shots/a11y/ring-chip.png', clip: { x: 130, y: 430, width: 500, height: 60 } });

// A skill row toggle focused - full-width control
const t = page.locator('button[aria-expanded]').nth(3);
await t.focus();
await page.screenshot({ path: '.review/shots/a11y/ring-skillrow.png', clip: { x: 130, y: 630, width: 1300, height: 130 } });
console.log('skillrow ring:', await t.evaluate(e => ({ color: getComputedStyle(e).color, outlineColor: getComputedStyle(e).outlineColor })));

// which rule wins?
const rules = await page.evaluate(`(() => {
  const out = [];
  for (const ss of document.styleSheets) {
    let rs; try { rs = ss.cssRules } catch(e) { continue }
    const walk = (list, layer) => { for (const r of list) {
      if (r.cssRules && (r.constructor.name==='CSSLayerBlockRule' || r.constructor.name==='CSSMediaRule' || r.constructor.name==='CSSSupportsRule')) walk(r.cssRules, (r.name||layer));
      else if (r.selectorText && r.selectorText.includes(':focus-visible') && r.style && r.style.cssText.includes('outline')) out.push({layer, sel:r.selectorText.slice(0,60), css:r.style.cssText.slice(0,120)});
    }};
    walk(rs, '(none)');
  }
  return out;
})()`);
console.log('focus-visible outline rules:', JSON.stringify(rules, null, 1));
await browser.close();
