// Slice each route into readable viewport-tall segments so the reviewer can
// actually see detail instead of a 15000px downscaled strip.
import { chromium, devices } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const BASE = "http://localhost:4173/rs3-leaderboard";
const VP = { width: 360, height: 740 };
const OUT = ".review/shots/mobilesmall/slices";

function arg(f, d) { const i = process.argv.indexOf(f); return i > -1 ? process.argv[i + 1] : d; }

const routes = arg("--routes", "/").split(",").filter(Boolean);
const maxSlices = Number(arg("--max", "8"));

mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: VP, isMobile: true, hasTouch: true, deviceScaleFactor: 2,
  userAgent: devices["iPhone 13"].userAgent, reducedMotion: "reduce",
});

for (const route of routes) {
  const page = await ctx.newPage();
  await page.goto(BASE + (route === "/" ? "/" : route + "/"), { waitUntil: "networkidle" });
  await page.waitForTimeout(900);
  const name = route === "/" ? "home" : route.replace(/\//g, "");
  const h = await page.evaluate(() => document.documentElement.scrollHeight);
  const n = Math.min(maxSlices, Math.ceil(h / VP.height));
  for (let i = 0; i < n; i++) {
    const y = i * VP.height;
    await page.evaluate((y) => window.scrollTo(0, y), y);
    await page.waitForTimeout(350);
    await page.screenshot({ path: join(OUT, `${name}-${String(i).padStart(2, "0")}.png`) });
  }
  console.log(`${route}: height=${h} slices=${n}`);
  await page.close();
}
await browser.close();
