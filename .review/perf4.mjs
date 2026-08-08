// Fourth pass: filmstrip proof of the blank-content window, and /live timing.
import { chromium } from "@playwright/test";
import { writeFileSync } from "node:fs";

const BASE = "http://localhost:4173/rs3-leaderboard";
const browser = await chromium.launch();
const log = {};

// --- filmstrip of /skills under 4x CPU + Fast 3G ---
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await cdp.send("Network.enable");
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  await cdp.send("Network.emulateNetworkConditions", {
    offline: false, latency: 150,
    downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8,
  });
  const nav = page.goto(BASE + "/skills/", { waitUntil: "domcontentloaded", timeout: 90000 });
  const marks = [];
  const t0 = Date.now();
  for (const at of [1500, 2500, 3500, 4500, 5500, 7000]) {
    const wait = at - (Date.now() - t0);
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    const shot = `.review/shots/performance/filmstrip-skills-${at}ms.png`;
    try {
      await page.screenshot({ path: shot });
      const vis = await page.evaluate(() => {
        const m = document.querySelector("main > div");
        const cs = m ? getComputedStyle(m) : null;
        const main = document.querySelector("main");
        return {
          wrapperOpacity: cs ? cs.opacity : "?",
          mainVisibleText: main ? (main.innerText || "").replace(/\s+/g, " ").trim().length : 0,
        };
      }).catch(() => ({}));
      marks.push({ at, ...vis, shot });
    } catch (e) { marks.push({ at, error: String(e).slice(0, 80) }); }
  }
  await nav.catch(() => {});
  log.filmstrip = marks;
  await page.close(); await ctx.close();
}

// --- /live: how does it handle the CORS-proxy failure? ---
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const errs = [], fails = [];
  page.on("console", (m) => { if (m.type() === "error") errs.push(m.text().slice(0, 140)); });
  page.on("requestfailed", (r) => fails.push(r.url().slice(0, 90) + " :: " + (r.failure()?.errorText || "")));
  const t0 = Date.now();
  await page.goto(BASE + "/live/", { waitUntil: "domcontentloaded", timeout: 60000 });
  const dom = Date.now() - t0;
  let idle;
  try { await page.waitForLoadState("networkidle", { timeout: 40000 }); idle = Date.now() - t0; }
  catch { idle = ">40000 TIMEOUT"; }
  await page.waitForTimeout(1000);
  await page.screenshot({ path: ".review/shots/performance/live-after-idle.png", fullPage: true });
  log.live = { dom, idle, consoleErrors: errs.length, sampleErrors: errs.slice(0, 6),
    requestFailures: fails.length, sampleFailures: fails.slice(0, 6),
    text: (await page.evaluate(() => (document.querySelector("main")?.innerText || "").replace(/\s+/g, " ").trim().slice(0, 400))),
    ongoingRequests: await page.evaluate(() => performance.getEntriesByType("resource").filter(r => r.initiatorType === "fetch" || r.initiatorType === "xmlhttprequest").length),
  };
  await page.close(); await ctx.close();
}

await browser.close();
writeFileSync(".review/shots/performance/perf4.json", JSON.stringify(log, null, 2));
console.log(JSON.stringify(log, null, 2));
