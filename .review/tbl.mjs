import { chromium } from "@playwright/test";
const b = await chromium.launch();
const p = await b.newPage();
for (const w of [820, 960, 1152, 1400]) {
  await p.setViewportSize({ width: w + 40, height: 600 });
  await p.goto("file:///home/mbaraofiorin/dev/rs3-leaderboard/.review/tblcheck.html");
  await p.evaluate((w) => (document.getElementById("wrap").style.width = w + "px"), w);
  console.log(w, await p.evaluate(() => [...document.querySelectorAll("th")].map((t) => `${t.textContent}=${Math.round(t.getBoundingClientRect().width)}`).join(" ")));
}
await b.close();
