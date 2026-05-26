import { chromium } from "playwright";
import { mkdirSync } from "fs";
import { resolve } from "path";

// Codex redesign visual check. Captures the home page + goals page across
// 3 viewports so a human (or me) can eyeball the result.

const OUT = resolve("playwright-report/codex-screens");
mkdirSync(OUT, { recursive: true });

const VPS = [
  { name: "desktop", width: 1280, height: 800 },
  { name: "tablet",  width: 768,  height: 1024 },
  { name: "mobile",  width: 393,  height: 851  },
];

(async () => {
  const browser = await chromium.launch();
  for (const vp of VPS) {
    const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: 2 });
    const page = await ctx.newPage();
    await page.goto("http://localhost:3000/", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1200);
    await page.screenshot({ path: `${OUT}/${vp.name}-home.png`, fullPage: false });
    // Open goals page
    await page.evaluate(() => { if (typeof launchSection === "function") launchSection("goals"); });
    await page.waitForTimeout(600);
    await page.screenshot({ path: `${OUT}/${vp.name}-goals.png`, fullPage: false });
    // Open notif panel
    await page.evaluate(() => {
      if (typeof notif !== "undefined") {
        notif.add({ type: "levelup", player: "Decxus", payload: { skillName: "Necromancy", level: 80 } });
        notif.add({ type: "quest", player: "Soclopata", payload: { questName: "Plague's End" } });
      }
    });
    await page.click("#notif-bell").catch(() => {});
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${OUT}/${vp.name}-notif.png`, fullPage: false });
    await ctx.close();
    console.log(`✓ ${vp.name}`);
  }
  await browser.close();
})();
