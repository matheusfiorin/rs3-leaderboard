// Third pass: (a) is the prerendered HTML actually paintable without JS?
// (b) interaction latency on /quests (363 rows) and /skills under 4x CPU.
import { chromium } from "@playwright/test";
import { writeFileSync } from "node:fs";

const BASE = "http://localhost:4173/rs3-leaderboard";
const browser = await chromium.launch();
const log = {};

// ---- (a) JS disabled: what does the static export paint on its own? ----
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, javaScriptEnabled: false });
  for (const route of ["/", "/skills", "/quests", "/pvm", "/money"]) {
    const page = await ctx.newPage();
    await page.goto(BASE + (route === "/" ? "/" : route + "/"), { waitUntil: "load", timeout: 30000 });
    await page.waitForTimeout(400);
    const info = await page.evaluate(() => ({
      nodes: document.getElementsByTagName("*").length,
      text: (document.body.innerText || "").replace(/\s+/g, " ").trim().length,
      height: document.documentElement.scrollHeight,
      sample: (document.body.innerText || "").replace(/\s+/g, " ").trim().slice(0, 180),
    }));
    log["nojs" + route] = info;
    await page.screenshot({ path: `.review/shots/performance/nojs-${route === "/" ? "home" : route.slice(1)}.png`, fullPage: false });
    await page.close();
  }
  await ctx.close();
}

// ---- (b) interaction latency under 4x CPU throttling ----
async function interact(route, fn) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  await page.goto(BASE + route, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(1200);
  await page.evaluate(() => {
    window.__lt = [];
    new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__lt.push(Math.round(e.duration)); }).observe({ type: "longtask", buffered: false });
  });
  const out = await fn(page);
  const lt = await page.evaluate(() => window.__lt);
  await page.close(); await ctx.close();
  return { ...out, longTasksDuringInteraction: lt.filter(d => d > 50) };
}

// /quests: type in the search box, one char at a time, timing each keystroke.
log.questsSearch = await interact("/quests/", async (page) => {
  const nodesBefore = await page.evaluate(() => document.getElementsByTagName("*").length);
  const box = page.locator('input[type="search"], input[type="text"], input[placeholder]').first();
  const n = await box.count();
  if (!n) return { error: "no search input found", nodesBefore };
  await box.click();
  const times = [];
  for (const ch of "dragon") {
    const t = Date.now();
    await box.press(ch);
    await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
    times.push(Date.now() - t);
  }
  const nodesAfter = await page.evaluate(() => document.getElementsByTagName("*").length);
  await page.screenshot({ path: ".review/shots/performance/quests-search-dragon.png", fullPage: false });
  return { keystrokeMs: times, nodesBefore, nodesAfter,
    placeholder: await box.getAttribute("placeholder") };
});

// /quests: click each filter/tab and time the re-render.
log.questsFilters = await interact("/quests/", async (page) => {
  const btns = page.locator("button");
  const total = await btns.count();
  const results = [];
  for (let i = 0; i < Math.min(total, 14); i++) {
    const b = btns.nth(i);
    const label = ((await b.textContent()) || "").trim().slice(0, 24);
    if (!label) continue;
    const t = Date.now();
    try {
      await b.click({ timeout: 3000 });
      await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
    } catch { continue; }
    results.push({ label, ms: Date.now() - t, nodes: await page.evaluate(() => document.getElementsByTagName("*").length) });
  }
  return { buttons: total, results };
});

// /skills: switch player + expand collapsibles.
log.skillsInteract = await interact("/skills/", async (page) => {
  const results = [];
  const btns = page.locator("button");
  const total = await btns.count();
  for (let i = 0; i < Math.min(total, 12); i++) {
    const b = btns.nth(i);
    const label = ((await b.textContent()) || "").trim().slice(0, 24);
    if (!label) continue;
    const t = Date.now();
    try { await b.click({ timeout: 3000 }); await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))); } catch { continue; }
    results.push({ label, ms: Date.now() - t });
  }
  return { buttons: total, results };
});

await browser.close();
writeFileSync(".review/shots/performance/perf3.json", JSON.stringify(log, null, 2));
console.log(JSON.stringify(log, null, 2));
