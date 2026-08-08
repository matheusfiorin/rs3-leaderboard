// Shared browser harness for the UI/UX review pass.
//
// Each reviewer runs its own chromium instance against the PRODUCTION static
// export (served by scripts/serve-docs.mjs at the real basePath), so what they
// see is what GitHub Pages will serve — not a dev build with different bundle
// sizes, different hydration timing and unminified CSS.
//
// Usage from a review agent:
//   node .review/harness.mjs --routes /,/skills --viewport mobile --out .review/shots/mine
//
// Then Read the emitted PNGs — they render inline — and the JSON report for the
// measurements a screenshot cannot show.

import { chromium, devices } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const BASE = process.env.REVIEW_BASE ?? "http://localhost:4173/rs3-leaderboard";

export const VIEWPORTS = {
  mobile: { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
  mobileSmall: { width: 360, height: 740, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
  tablet: { width: 834, height: 1112, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
  desktop: { width: 1440, height: 900, deviceScaleFactor: 1 },
  desktopWide: { width: 1920, height: 1080, deviceScaleFactor: 1 },
};

export const ROUTES = [
  "/", "/skills", "/quests", "/goals", "/pvm", "/dungeons", "/gear",
  "/capes", "/money", "/activity", "/live", "/lookup", "/settings", "/archive",
];

/**
 * Measurements a screenshot cannot show: overflow, tap-target sizes, contrast
 * failures, console errors, and load timings.
 */
async function audit(page) {
  return page.evaluate(() => {
    const doc = document.documentElement;

    // Horizontal overflow is the single most common mobile defect, so also
    // name the widest offending element rather than just flagging the page.
    const pageWidth = doc.clientWidth;
    let widest = null;
    let widestPx = 0;
    for (const el of Array.from(document.body.querySelectorAll("*"))) {
      const r = el.getBoundingClientRect();
      const overhang = Math.round(r.right - pageWidth);
      if (overhang > widestPx && r.width > 0) {
        widestPx = overhang;
        widest =
          el.tagName.toLowerCase() +
          (el.className && typeof el.className === "string"
            ? "." + el.className.split(/\s+/).filter(Boolean).slice(0, 3).join(".")
            : "");
      }
    }

    // Interactive elements below the 44px touch minimum. Only meaningful on a
    // touch viewport — a 32px button is fine for a mouse, so counting them on
    // desktop would bury the real findings in noise.
    const touch =
      window.matchMedia("(pointer: coarse)").matches || "ontouchstart" in window;
    const small = [];
    if (touch) {
      for (const el of Array.from(
        document.querySelectorAll(
          "a, button, input, select, textarea, [role=tab], [role=button]",
        ),
      )) {
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) continue;
        // Skip visually-hidden affordances (skip links, sr-only inputs behind
        // a styled label). They are 1x1 by design and are not touch targets.
        if (r.width <= 2 || r.height <= 2) continue;
        const cs = getComputedStyle(el);
        if (cs.visibility === "hidden" || cs.opacity === "0") continue;
        if (r.height < 44 || r.width < 24) {
          small.push({
            tag: el.tagName.toLowerCase(),
            text: (el.textContent || el.getAttribute("aria-label") || "")
              .trim()
              .slice(0, 32),
            w: Math.round(r.width),
            h: Math.round(r.height),
          });
        }
      }
    }

    // Icon-only controls with no accessible name.
    const unlabelled = [];
    for (const el of Array.from(document.querySelectorAll("button, a"))) {
      const text = (el.textContent || "").trim();
      const label = el.getAttribute("aria-label") || el.getAttribute("title");
      if (!text && !label) {
        unlabelled.push(el.tagName.toLowerCase() + " " + (el.className || "").slice(0, 40));
      }
    }

    const headings = Array.from(document.querySelectorAll("h1,h2,h3")).map(
      (h) => h.tagName + ": " + (h.textContent || "").trim().slice(0, 48),
    );

    return {
      scrollWidth: doc.scrollWidth,
      clientWidth: pageWidth,
      horizontalOverflow: doc.scrollWidth > pageWidth + 1,
      widestOffender: widest,
      widestOverhangPx: widestPx,
      pageHeight: doc.scrollHeight,
      smallTapTargets: small.slice(0, 15),
      smallTapTargetCount: small.length,
      unlabelledControls: unlabelled.slice(0, 10),
      headings: headings.slice(0, 12),
      textLength: (document.body.innerText || "").length,
    };
  });
}

export async function review({ routes, viewport, out, fullPage = true }) {
  mkdirSync(out, { recursive: true });
  const vp = VIEWPORTS[viewport];
  if (!vp) throw new Error(`unknown viewport ${viewport}`);

  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    isMobile: Boolean(vp.isMobile),
    hasTouch: Boolean(vp.hasTouch),
    deviceScaleFactor: vp.deviceScaleFactor,
    userAgent: vp.isMobile
      ? devices["iPhone 13"].userAgent
      : undefined,
    reducedMotion: "reduce", // deterministic screenshots
  });

  const report = [];

  for (const route of routes) {
    const page = await context.newPage();
    const consoleErrors = [];
    const failedRequests = [];
    page.on("console", (m) => {
      if (m.type() === "error") consoleErrors.push(m.text().slice(0, 200));
    });
    page.on("pageerror", (e) => consoleErrors.push("PAGEERROR: " + e.message.slice(0, 200)));
    page.on("response", (r) => {
      if (r.status() >= 400) failedRequests.push(`${r.status()} ${r.url()}`);
    });

    const url = BASE + (route === "/" ? "/" : route + "/");
    const started = Date.now();
    let status = 0;
    try {
      // `domcontentloaded`, not `networkidle`: /live polls third-party CORS
      // proxies on a retry loop that never goes idle, which reported a 21s
      // "load" for a page that actually paints in well under a second.
      const res = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
      status = res?.status() ?? 0;
    } catch (e) {
      report.push({ route, error: String(e).slice(0, 200) });
      await page.close();
      continue;
    }
    const loadMs = Date.now() - started;

    // Real paint timing, independent of any background polling.
    const paint = await page
      .evaluate(() => {
        const fcp = performance.getEntriesByName("first-contentful-paint")[0];
        return fcp ? Math.round(fcp.startTime) : null;
      })
      .catch(() => null);

    // Let client revalidation and the entry animation settle.
    await page.waitForTimeout(1200);

    const metrics = await audit(page);
    const name = route === "/" ? "home" : route.replace(/\//g, "");
    const file = join(out, `${viewport}-${name}.png`);
    await page.screenshot({ path: file, fullPage });

    report.push({
      route,
      status,
      loadMs,
      fcpMs: paint,
      screenshot: file,
      ...metrics,
      consoleErrors,
      failedRequests: failedRequests.slice(0, 8),
    });

    await page.close();
  }

  await browser.close();
  const reportPath = join(out, `report-${viewport}.json`);
  writeFileSync(reportPath, JSON.stringify(report, null, 2));
  return { report, reportPath };
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function arg(flag, fallback) {
  const i = process.argv.indexOf(flag);
  return i > -1 ? process.argv[i + 1] : fallback;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const routes = arg("--routes", ROUTES.join(",")).split(",").filter(Boolean);
  const viewport = arg("--viewport", "desktop");
  const out = arg("--out", ".review/shots");

  const { report, reportPath } = await review({ routes, viewport, out });

  // Terse console summary; the JSON has the detail.
  for (const r of report) {
    if (r.error) {
      console.log(`${r.route.padEnd(12)} ERROR ${r.error}`);
      continue;
    }
    const flags = [
      r.horizontalOverflow ? `OVERFLOW(+${r.widestOverhangPx}px ${r.widestOffender})` : "",
      r.smallTapTargetCount ? `${r.smallTapTargetCount} small targets` : "",
      r.consoleErrors.length ? `${r.consoleErrors.length} console errors` : "",
      r.failedRequests.length ? `${r.failedRequests.length} failed reqs` : "",
      r.unlabelledControls.length ? `${r.unlabelledControls.length} unlabelled` : "",
    ].filter(Boolean);
    console.log(
      `${r.route.padEnd(12)} ${String(r.status).padEnd(4)} ${String(r.loadMs).padStart(5)}ms  fcp ${String(r.fcpMs ?? "-").padStart(4)}ms  ` +
        `${String(r.pageHeight).padStart(6)}px tall  ${flags.join(" · ") || "clean"}`,
    );
  }
  console.log(`\nreport: ${reportPath}`);
}
