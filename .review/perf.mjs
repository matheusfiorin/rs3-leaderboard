// Performance measurement pass: CDP-based metrics per route.
// Runs each route twice: unthrottled (baseline) and with 4x CPU + Fast 3G
// network throttling (what a real mid-range laptop / phone actually sees).

import { chromium } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const BASE = "http://localhost:4173/rs3-leaderboard";
const OUT = ".review/shots/performance";
mkdirSync(OUT, { recursive: true });

const routes = (process.argv[2] || "/,/skills,/quests,/pvm,/money").split(",");
const cpuThrottle = Number(process.argv[3] || 1);
const netThrottle = process.argv[4] === "net";

const results = [];

const browser = await chromium.launch();

for (const route of routes) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);

  await cdp.send("Performance.enable");
  await cdp.send("Network.enable");
  if (cpuThrottle > 1) await cdp.send("Emulation.setCPUThrottlingRate", { rate: cpuThrottle });
  if (netThrottle) {
    await cdp.send("Network.emulateNetworkConditions", {
      offline: false,
      latency: 150,
      downloadThroughput: (1.6 * 1024 * 1024) / 8,
      uploadThroughput: (750 * 1024) / 8,
    });
  }

  // Per-request accounting from the network layer, so we see what each route
  // actually pulls rather than guessing from the chunk directory.
  const reqs = new Map();
  cdp.on("Network.responseReceived", (e) => {
    reqs.set(e.requestId, { url: e.response.url, type: e.type, mime: e.response.mimeType });
  });
  cdp.on("Network.loadingFinished", (e) => {
    const r = reqs.get(e.requestId);
    if (r) r.encoded = e.encodedDataLength;
  });

  // Install observers before navigation so nothing is missed.
  await page.addInitScript(() => {
    window.__perf = { lcp: 0, cls: 0, longTasks: [], fcp: 0, shifts: [] };
    new PerformanceObserver((l) => {
      for (const e of l.getEntries()) {
        if (e.name === "first-contentful-paint") window.__perf.fcp = e.startTime;
      }
    }).observe({ type: "paint", buffered: true });
    new PerformanceObserver((l) => {
      for (const e of l.getEntries()) {
        window.__perf.lcp = e.startTime;
        window.__perf.lcpEl = e.element ? e.element.tagName + "." + (e.element.className || "").slice(0, 60) : e.url || "?";
        window.__perf.lcpSize = e.size;
      }
    }).observe({ type: "largest-contentful-paint", buffered: true });
    new PerformanceObserver((l) => {
      for (const e of l.getEntries()) {
        if (!e.hadRecentInput) {
          window.__perf.cls += e.value;
          window.__perf.shifts.push({
            v: Number(e.value.toFixed(4)),
            t: Math.round(e.startTime),
            nodes: (e.sources || []).map((s) => s.node ? s.node.tagName + "." + String(s.node.className || "").slice(0, 40) : "?").slice(0, 3),
          });
        }
      }
    }).observe({ type: "layout-shift", buffered: true });
    new PerformanceObserver((l) => {
      for (const e of l.getEntries()) {
        window.__perf.longTasks.push({ start: Math.round(e.startTime), dur: Math.round(e.duration) });
      }
    }).observe({ type: "longtask", buffered: true });
  });

  const t0 = Date.now();
  await page.goto(BASE + (route === "/" ? "/" : route + "/"), { waitUntil: "domcontentloaded", timeout: 60000 });
  const domMs = Date.now() - t0;
  try {
    await page.waitForLoadState("networkidle", { timeout: 30000 });
  } catch { /* /live etc. never idles */ }
  const idleMs = Date.now() - t0;

  // Give observers a beat to flush the last LCP / longtask entries.
  await page.waitForTimeout(1500);

  const perf = await page.evaluate(() => {
    const nav = performance.getEntriesByType("navigation")[0] || {};
    const res = performance.getEntriesByType("resource").map((r) => ({
      name: r.name.split("/").pop(),
      type: r.initiatorType,
      dur: Math.round(r.duration),
      size: r.decodedBodySize || r.transferSize || 0,
      enc: r.encodedBodySize || 0,
    }));
    return {
      ...window.__perf,
      domContentLoaded: Math.round(nav.domContentLoadedEventEnd || 0),
      loadEvent: Math.round(nav.loadEventEnd || 0),
      responseEnd: Math.round(nav.responseEnd || 0),
      htmlBytes: nav.decodedBodySize || 0,
      htmlEncoded: nav.encodedBodySize || 0,
      resources: res,
      domNodes: document.getElementsByTagName("*").length,
      bodyText: (document.body.innerText || "").length,
    };
  });

  // TBT: blocking time is longtask duration beyond 50ms, up to TTI-ish window.
  const tbt = perf.longTasks.reduce((a, t) => a + Math.max(0, t.dur - 50), 0);

  const js = perf.resources.filter((r) => r.name.endsWith(".js"));
  const css = perf.resources.filter((r) => r.name.endsWith(".css"));
  const jsonReq = perf.resources.filter((r) => r.name.endsWith(".json") || r.type === "fetch" || r.type === "xmlhttprequest");
  const sum = (a) => a.reduce((x, r) => x + r.size, 0);
  const sumEnc = (a) => a.reduce((x, r) => x + r.enc, 0);

  results.push({
    route,
    cpuThrottle,
    netThrottle,
    fcp: Math.round(perf.fcp),
    lcp: Math.round(perf.lcp),
    lcpEl: perf.lcpEl,
    cls: Number((perf.cls || 0).toFixed(4)),
    shifts: perf.shifts,
    tbt,
    longTasks: perf.longTasks.filter((t) => t.dur > 50),
    longTaskTotal: perf.longTasks.reduce((a, t) => a + t.dur, 0),
    domMs,
    idleMs,
    domContentLoaded: perf.domContentLoaded,
    loadEvent: perf.loadEvent,
    htmlKB: Math.round(perf.htmlBytes / 1024),
    htmlEncKB: Math.round(perf.htmlEncoded / 1024),
    jsCount: js.length,
    jsDecodedKB: Math.round(sum(js) / 1024),
    jsEncodedKB: Math.round(sumEnc(js) / 1024),
    cssKB: Math.round(sum(css) / 1024),
    dataKB: Math.round(sum(jsonReq) / 1024),
    domNodes: perf.domNodes,
    biggestJs: js.sort((a, b) => b.size - a.size).slice(0, 8).map((r) => `${r.name} ${Math.round(r.size / 1024)}KB(enc ${Math.round(r.enc / 1024)})`),
    allJs: js.map((r) => r.name),
  });

  await page.close();
  await context.close();
}

await browser.close();

const tag = `cpu${cpuThrottle}${netThrottle ? "-net" : ""}`;
writeFileSync(join(OUT, `perf-${tag}.json`), JSON.stringify(results, null, 2));

console.log(`\n=== ${tag} ===`);
console.log("route      FCP    LCP   TBT   CLS   dom   idle  html  JSdec/enc  css  nodes");
for (const r of results) {
  console.log(
    `${r.route.padEnd(9)} ${String(r.fcp).padStart(5)} ${String(r.lcp).padStart(6)} ${String(r.tbt).padStart(5)} ${String(r.cls).padStart(6)} ` +
    `${String(r.domMs).padStart(5)} ${String(r.idleMs).padStart(6)} ${String(r.htmlKB).padStart(5)}K ${String(r.jsDecodedKB).padStart(4)}/${String(r.jsEncodedKB).padStart(4)}K ${String(r.cssKB).padStart(4)}K ${String(r.domNodes).padStart(6)}`
  );
}
console.log("\nlong tasks >50ms:");
for (const r of results) console.log(`  ${r.route}: ${r.longTasks.map((t) => `${t.dur}ms@${t.start}`).join(", ") || "none"}`);
console.log("\nbiggest JS per route:");
for (const r of results) console.log(`  ${r.route}:\n    ${r.biggestJs.join("\n    ")}`);
