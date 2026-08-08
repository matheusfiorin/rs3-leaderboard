import { chromium } from "@playwright/test";
const b = await chromium.launch();
for (const route of ["/", "/skills", "/money", "/pvm"]) {
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const hits = [];
  page.on("request", r => { if (r.url().includes("_quests.json") || r.url().includes("hiscores") || r.url().includes("profile.json") || r.url().includes("ge_prices")) hits.push(r.url().split("/").pop()); });
  await page.goto("http://localhost:4173/rs3-leaderboard" + (route === "/" ? "/" : route + "/"), { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  const c = {}; for (const h of hits) c[h] = (c[h] || 0) + 1;
  console.log(route, JSON.stringify(c));
  await page.close(); await ctx.close();
}
await b.close();
