import { chromium } from "@playwright/test";
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
await page.goto("http://localhost:4173/rs3-leaderboard/quests/", { waitUntil: "networkidle" });
await page.waitForTimeout(1500);
const r = await page.evaluate(() => {
  // the quest table rows are the ones carrying content-visibility
  const all = Array.from(document.querySelectorAll("li"));
  const cv = all.filter(l => getComputedStyle(l).contentVisibility === "auto");
  const hs = cv.map(l => Math.round(l.getBoundingClientRect().height)).filter(h => h > 0);
  const cs = cv.length ? getComputedStyle(cv[0]) : null;
  const counts = {};
  for (const h of hs) counts[h] = (counts[h] || 0) + 1;
  return { totalLi: all.length, cvRows: cv.length, distinctHeights: counts,
    intrinsic: cs ? cs.getPropertyValue("contain-intrinsic-size") : "?",
    docHeight: document.documentElement.scrollHeight };
});
console.log(JSON.stringify(r, null, 2));
await b.close();
