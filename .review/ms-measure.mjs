import { chromium, devices } from "@playwright/test";
const BASE = "http://localhost:4173/rs3-leaderboard";
const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 360, height: 740 }, isMobile: true, hasTouch: true,
  deviceScaleFactor: 2, userAgent: devices["iPhone 13"].userAgent, reducedMotion: "reduce",
});
for (const route of ["/pvm", "/quests", "/money"]) {
  const page = await ctx.newPage();
  await page.goto(BASE + route + "/", { waitUntil: "networkidle" });
  await page.waitForTimeout(900);
  const r = await page.evaluate(() => {
    const out = { segGroups: [] };
    // any container whose direct children are >=3 buttons
    document.querySelectorAll("div").forEach((d) => {
      const kids = [...d.children].filter((c) => c.tagName === "BUTTON");
      if (kids.length < 3 || kids.length !== d.children.length) return;
      const rows = new Set(kids.map((k) => Math.round(k.getBoundingClientRect().top)));
      const dr = d.getBoundingClientRect();
      out.segGroups.push({
        labels: kids.map((k) => k.textContent.trim()).join(","),
        rows: rows.size,
        groupW: Math.round(dr.width), groupH: Math.round(dr.height),
        btnH: Math.round(kids[0].getBoundingClientRect().height),
        lastRight: Math.round(Math.max(...kids.map((k) => k.getBoundingClientRect().right))),
        deadRightPx: Math.round(dr.right - 8 - Math.max(...kids.filter((k) => Math.round(k.getBoundingClientRect().top) === Math.max(...kids.map((x) => Math.round(x.getBoundingClientRect().top)))).map((k) => k.getBoundingClientRect().right))),
        ariaLabel: d.getAttribute("aria-label"), role: d.getAttribute("role"),
      });
    });
    // chrome height before first content card
    return out;
  });
  console.log(route, JSON.stringify(r, null, 1));
  await page.close();
}
await browser.close();
