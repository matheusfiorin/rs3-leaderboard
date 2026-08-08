// Fifth pass: quests row geometry vs contain-intrinsic-size, CLS attribution,
// and the cost of the "All 363" commit measured with React's own timing.
import { chromium } from "@playwright/test";
import { writeFileSync } from "node:fs";

const BASE = "http://localhost:4173/rs3-leaderboard";
const browser = await chromium.launch();
const log = {};

const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
const cdp = await ctx.newCDPSession(page);
await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });

await page.addInitScript(() => {
  window.__shift = [];
  new PerformanceObserver((l) => {
    for (const e of l.getEntries()) if (!e.hadRecentInput) window.__shift.push({
      v: Number(e.value.toFixed(4)), t: Math.round(e.startTime),
      src: (e.sources || []).map(s => s.node ? (s.node.tagName + "." + String(s.node.className || "").slice(0, 60)) : "?"),
    });
  }).observe({ type: "layout-shift", buffered: true });
});

await page.goto(BASE + "/quests/", { waitUntil: "networkidle", timeout: 60000 });
await page.waitForTimeout(2000);

log.geometry = await page.evaluate(() => {
  const lis = Array.from(document.querySelectorAll("ul li"));
  const hs = lis.map(l => Math.round(l.getBoundingClientRect().height));
  const cs = lis.length ? getComputedStyle(lis[0]) : null;
  return {
    rows: lis.length,
    heightsSample: hs.slice(0, 6),
    minH: Math.min(...hs), maxH: Math.max(...hs),
    medianH: hs.sort((a, b) => a - b)[Math.floor(hs.length / 2)],
    containIntrinsicSize: cs ? cs.containIntrinsicSize || cs.getPropertyValue("contain-intrinsic-size") : "?",
    contentVisibility: cs ? cs.contentVisibility : "?",
    docHeight: document.documentElement.scrollHeight,
  };
});

log.shiftsAfterLoad = await page.evaluate(() => window.__shift);

// Scroll to the bottom and see whether content-visibility causes the scrollbar
// to jump (the classic intrinsic-size mismatch symptom).
log.scrollJump = await page.evaluate(async () => {
  const before = document.documentElement.scrollHeight;
  window.scrollTo(0, document.documentElement.scrollHeight);
  await new Promise(r => setTimeout(r, 900));
  const mid = document.documentElement.scrollHeight;
  window.scrollTo(0, document.documentElement.scrollHeight);
  await new Promise(r => setTimeout(r, 900));
  return { before, afterFirstScroll: mid, afterSecond: document.documentElement.scrollHeight,
    driftPx: document.documentElement.scrollHeight - before };
});
log.shiftsAfterScroll = await page.evaluate(() => window.__shift);

// Time the "All 363" commit precisely, from click to the frame that paints it.
await page.getByRole("button", { name: /^Both/ }).first().click().catch(() => {});
await page.waitForTimeout(600);
log.allCommit = await page.evaluate(async () => {
  const btn = Array.from(document.querySelectorAll("button")).find(b => /^All\s*363/.test((b.textContent || "").replace(/\s+/g, " ").trim()) || /^All363/.test((b.textContent || "").trim()));
  if (!btn) return { error: "All 363 button not found", labels: Array.from(document.querySelectorAll("button")).map(b => (b.textContent || "").trim().slice(0, 20)) };
  const nodesBefore = document.getElementsByTagName("*").length;
  const t = performance.now();
  btn.click();
  await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
  const paint = performance.now() - t;
  return { clickToPaintMs: Math.round(paint), nodesBefore, nodesAfter: document.getElementsByTagName("*").length,
    longTasksSince: performance.getEntriesByType("longtask").filter(e => e.startTime > t).map(e => Math.round(e.duration)) };
});

await page.screenshot({ path: ".review/shots/performance/quests-viewport-top.png" });
await page.close(); await ctx.close(); await browser.close();
writeFileSync(".review/shots/performance/perf5.json", JSON.stringify(log, null, 2));
console.log(JSON.stringify(log, null, 2));
