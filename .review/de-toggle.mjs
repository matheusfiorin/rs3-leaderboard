import { chromium } from '@playwright/test';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
for (const r of ['/pvm','/dungeons','/gear','/capes']) {
  await p.goto('http://localhost:4173/rs3-leaderboard'+r, { waitUntil: 'networkidle' });
  await p.waitForTimeout(400);
  console.log(r, JSON.stringify(await p.evaluate(() => {
    const btns = [...document.querySelectorAll('button')].filter(x => /^(decxus|soclopata)$/i.test(x.innerText.trim()));
    return btns.map(x => { const s = getComputedStyle(x);
      return { txt: x.innerText, tt: s.textTransform, fs: s.fontSize, ff: s.fontFamily.split(',')[0],
        radius: s.borderRadius, border: s.borderColor, bg: s.backgroundColor, h: Math.round(x.getBoundingClientRect().height),
        parentBorder: getComputedStyle(x.parentElement).borderWidth, parentRadius: getComputedStyle(x.parentElement).borderRadius,
        aria: x.getAttribute('aria-pressed') };
    });
  })));
}
await b.close();
