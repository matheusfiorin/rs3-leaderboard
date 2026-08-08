// Second pass: split JS into "critical path" (requested before LCP) vs
// "prefetch tail" (after), and measure under 4x CPU + Fast-3G throttling.
import { chromium } from "@playwright/test";
import { writeFileSync } from "node:fs";

const BASE = "http://localhost:4173/rs3-leaderboard";
const routes = (process.argv[2] || "/,/skills,/quests,/pvm,/money").split(",");
const cpu = Number(process.argv[3] || 4);
const net = process.argv[4] === "net";

const browser = await chromium.launch();
const out = [];

for (const route of routes) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await cdp.send("Network.enable");
  if (cpu > 1) await cdp.send("Emulation.setCPUThrottlingRate", { rate: cpu });
  if (net) {
    await cdp.send("Network.emulateNetworkConditions", {
      offline: false, latency: 150,
      downloadThroughput: (1.6 * 1024 * 1024) / 8,
      uploadThroughput: (750 * 1024) / 8,
    });
  }

  await page.addInitScript(() => {
    window.__p = { lcp: 0, fcp: 0, cls: 0, lt: [] };
    new PerformanceObserver((l) => { for (const e of l.getEntries()) if (e.name === "first-contentful-paint") window.__p.fcp = e.startTime; }).observe({ type: "paint", buffered: true });
    new PerformanceObserver((l) => { for (const e of l.getEntries()) { window.__p.lcp = e.startTime; window.__p.lcpEl = e.element ? e.element.tagName + "." + String(e.element.className || "").slice(0, 50) : String(e.url || "?"); } }).observe({ type: "largest-contentful-paint", buffered: true });
    new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__p.cls += e.value; }).observe({ type: "layout-shift", buffered: true });
    new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__p.lt.push({ s: Math.round(e.startTime), d: Math.round(e.duration), attr: (e.attribution || []).map(a => a.name).join(",") }); }).observe({ type: "longtask", buffered: true });
  });

  const t0 = Date.now();
  await page.goto(BASE + (route === "/" ? "/" : route + "/"), { waitUntil: "domcontentloaded", timeout: 90000 });
  let idle = null;
  try { await page.waitForLoadState("networkidle", { timeout: 45000 }); idle = Date.now() - t0; } catch { idle = "TIMEOUT>45s"; }
  await page.waitForTimeout(2000);

  const d = await page.evaluate(() => {
    const p = window.__p;
    const res = performance.getEntriesByType("resource").map(r => ({
      n: r.name.split("/").pop(), t: r.initiatorType,
      start: Math.round(r.startTime), end: Math.round(r.responseEnd),
      kb: Math.round((r.decodedBodySize || r.transferSize || 0) / 1024),
    }));
    return { ...p, res, nodes: document.getElementsByTagName("*").length,
      nav: performance.getEntriesByType("navigation")[0]?.loadEventEnd || 0 };
  });

  const js = d.res.filter(r => r.n.endsWith(".js"));
  const lcp = d.lcp || 1e9;
  const before = js.filter(r => r.start <= lcp);
  const after = js.filter(r => r.start > lcp);
  const kb = a => a.reduce((x, r) => x + r.kb, 0);
  const tbt = d.lt.reduce((a, t) => a + Math.max(0, t.d - 50), 0);

  out.push({
    route, cpu, net,
    fcp: Math.round(d.fcp), lcp: Math.round(d.lcp), lcpEl: d.lcpEl,
    cls: Number(d.cls.toFixed(4)), tbt,
    longTasks: d.lt.filter(t => t.d > 50),
    load: Math.round(d.nav), idle, nodes: d.nodes,
    jsBeforeLcp: { count: before.length, kb: kb(before) },
    jsAfterLcp: { count: after.length, kb: kb(after) },
    lastJsEnd: js.length ? Math.max(...js.map(r => r.end)) : 0,
    tail: after.sort((a, b) => b.kb - a.kb).slice(0, 6).map(r => `${r.n} ${r.kb}KB @${r.start}-${r.end}`),
    critical: before.sort((a, b) => b.kb - a.kb).slice(0, 6).map(r => `${r.n} ${r.kb}KB @${r.start}-${r.end}`),
  });
  await page.close(); await ctx.close();
}
await browser.close();
writeFileSync(`.review/shots/performance/perf2-cpu${cpu}${net ? "-net" : ""}.json`, JSON.stringify(out, null, 2));
console.log(`\n== cpu${cpu}x ${net ? "Fast3G" : "no net throttle"} ==`);
console.log("route     FCP    LCP   TBT    CLS  load  idle    nodes  JS<=LCP    JS>LCP   lastJS");
for (const r of out) console.log(
  `${r.route.padEnd(8)} ${String(r.fcp).padStart(5)} ${String(r.lcp).padStart(6)} ${String(r.tbt).padStart(5)} ${String(r.cls).padStart(6)} ${String(r.load).padStart(5)} ${String(r.idle).padStart(6)} ${String(r.nodes).padStart(7)}  ${String(r.jsBeforeLcp.kb).padStart(4)}KB/${r.jsBeforeLcp.count}  ${String(r.jsAfterLcp.kb).padStart(4)}KB/${r.jsAfterLcp.count}  ${r.lastJsEnd}ms`);
for (const r of out) {
  console.log(`\n${r.route} LCP element: ${r.lcpEl}`);
  console.log(`  long tasks: ${r.longTasks.map(t => `${t.d}ms@${t.s}`).join(", ") || "none"}`);
  console.log(`  critical JS: ${r.critical.join(" | ")}`);
  console.log(`  tail JS:     ${r.tail.join(" | ")}`);
}
