import { chromium } from "playwright";
import { mkdirSync } from "fs";
import { resolve } from "path";

const OUT = resolve("playwright-report/audit");
mkdirSync(OUT, { recursive: true });

const VPS = [
  { name: "mobile-small", width: 360, height: 640 },
  { name: "mobile",       width: 393, height: 851 },
  { name: "tablet",       width: 768, height: 1024 },
];

(async () => {
  const browser = await chromium.launch();
  for (const vp of VPS) {
    const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: 2 });
    const page = await ctx.newPage();
    await page.goto("http://localhost:3000/", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${OUT}/${vp.name}-full.png`, fullPage: true });
    await ctx.close();
    console.log(`✓ ${vp.name}`);
  }
  await browser.close();
})();
