// Measures the /money defects this pass is meant to remove.
//
// Run it against the served production export. It prints one PASS/FAIL line per
// defect, so the same script documents the "before" (every line FAIL on the
// pre-fix build) and proves the "after".
//
//   node .review/verify-money.mjs
//
import { chromium, request } from "@playwright/test";

const BASE = process.env.BASE ?? "http://localhost:4173/rs3-leaderboard";
const URL = `${BASE}/money/`;

let failures = 0;
function check(name, ok, detail) {
  if (!ok) failures += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
}

// ---------------------------------------------------------------------------
// 1. Prerendered content: the route used to ship 284 visible characters.
// ---------------------------------------------------------------------------
const api = await request.newContext();
const raw = await (await api.get(URL)).text();
const visible = raw
  .replace(/<script[\s\S]*?<\/script>/g, "")
  .replace(/<[^>]+>/g, " ")
  .replace(/\s+/g, " ")
  .trim();
check(
  "static HTML carries the method list",
  visible.length > 8000,
  `${visible.length} visible chars in ${raw.length} bytes`,
);
check(
  'header no longer claims "live GE prices"',
  !visible.includes("live GE prices"),
  visible.slice(visible.indexOf("GP 68") || 0, 120).trim() || "n/a",
);
await api.dispose();

// ---------------------------------------------------------------------------
const browser = await chromium.launch();

async function open(width, height) {
  const page = await browser.newPage({ viewport: { width, height } });
  await page.goto(URL, { waitUntil: "load" });
  // Wait for the client gate pass (quest JSON) to settle the list.
  await page
    .locator("text=/Showing \\d+ of \\d+ methods/")
    .first()
    .waitFor({ timeout: 20000 })
    .catch(() => {});
  await page.waitForTimeout(1500);
  return page;
}

// ---------------------------------------------------------------------------
// 2. Wide hero must not stop at the left third.
// ---------------------------------------------------------------------------
{
  const page = await open(1920, 1080);
  const hero = page.locator("section[aria-labelledby='podium-head'] .lit-edge").first();
  const box = await hero.boundingBox();
  // Measure where ink actually stops. Block containers stretch to the card's
  // full width whether or not anything is drawn in them, so ranges over text
  // nodes (plus svg/img boxes) are the only honest ruler here.
  const rightmost = await hero.evaluate((el) => {
    let max = 0;
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    const range = document.createRange();
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      if (!n.textContent.trim()) continue;
      range.selectNodeContents(n);
      for (const r of range.getClientRects()) if (r.right > max) max = r.right;
    }
    for (const n of el.querySelectorAll("svg,img")) {
      const r = n.getBoundingClientRect();
      if (r.width && r.right > max) max = r.right;
    }
    return max;
  });
  const fill = box ? (rightmost - box.x) / box.width : 0;
  check(
    "hero fills its card at 1920",
    fill > 0.8,
    `content reaches ${(fill * 100).toFixed(0)}% of a ${Math.round(box?.width ?? 0)}px card`,
  );

  // ------------------------------------------------------------------------
  // 3. Card titles share a left edge (icon slot reserved).
  // ------------------------------------------------------------------------
  const xs = await page.evaluate(() => {
    const cards = [...document.querySelectorAll("div.grid > div")].filter((c) =>
      c.querySelector("a[target='_blank']"),
    );
    const byColumn = new Map();
    for (const c of cards) {
      const a = c.querySelector("a[target='_blank']");
      if (!a) continue;
      const col = Math.round(c.getBoundingClientRect().x);
      const list = byColumn.get(col) ?? [];
      list.push(Math.round(a.getBoundingClientRect().x));
      byColumn.set(col, list);
    }
    return [...byColumn.values()].filter((l) => l.length > 2);
  });
  const spread = Math.max(0, ...xs.map((l) => Math.max(...l) - Math.min(...l)));
  check(
    "title column is stable down the grid",
    spread <= 1,
    `worst per-column x spread ${spread}px across ${xs.length} columns`,
  );

  // ------------------------------------------------------------------------
  // 4. The top three are not printed twice.
  // ------------------------------------------------------------------------
  const dupes = await page.evaluate(() => {
    const names = [...document.querySelectorAll("a[target='_blank']")].map((a) =>
      a.textContent.trim(),
    );
    const seen = new Map();
    for (const n of names) seen.set(n, (seen.get(n) ?? 0) + 1);
    return [...seen].filter(([, c]) => c > 1).map(([n, c]) => `${n} ×${c}`);
  });
  check("no method rendered twice", dupes.length === 0, dupes.join(", ") || "none");

  // ------------------------------------------------------------------------
  // 5. Rates that are hardcoded estimates say so.
  // ------------------------------------------------------------------------
  const est = await page.evaluate(
    () =>
      [...document.querySelectorAll("span")].filter((s) => s.textContent.trim() === "est")
        .length,
  );
  check("estimated rates are marked", est > 10, `${est} EST tags`);

  await page.close();
}

// ---------------------------------------------------------------------------
// 6. Mobile: filter captions, no horizontal page scroll, NET stays on one line.
// ---------------------------------------------------------------------------
{
  const page = await open(360, 740);
  for (const caption of ["Category", "Effort", "Access", "Sort", "Availability"]) {
    const n = await page
      .locator(`div.mb-1:text-is("${caption}")`)
      .count()
      .catch(() => 0);
    check(`filter group labelled "${caption}"`, n > 0, `${n} match`);
  }

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  check("no horizontal page scroll at 360px", overflow <= 0, `${overflow}px`);

  // Open the first recipe and measure its NET cell.
  const summary = page.locator("summary", { hasText: "Recipe" }).first();
  if (await summary.count()) {
    await summary.click();
    await page.waitForTimeout(300);
    const net = await page.evaluate(() => {
      const td = [...document.querySelectorAll("td")].find(
        (c) => c.textContent.trim().toUpperCase() === "NET",
      );
      if (!td) return null;
      const value = td.parentElement.lastElementChild;
      const r = value.getBoundingClientRect();
      const style = getComputedStyle(value);
      return {
        text: value.textContent.trim(),
        lines: Math.round(r.height / parseFloat(style.lineHeight || "16")),
        nowrap: style.whiteSpace.includes("nowrap"),
      };
    });
    check(
      "NET rate stays on one line",
      Boolean(net?.nowrap) && (net?.lines ?? 9) <= 1,
      net ? `${net.text} / ${net.lines} line(s) / nowrap=${net.nowrap}` : "no NET row",
    );

    const chevron = await page.evaluate(() => {
      const s = [...document.querySelectorAll("summary")].find((x) =>
        /recipe/i.test(x.textContent),
      );
      return {
        hasSvg: Boolean(s?.querySelector("svg")),
        hasShowText: /show|hide/i.test(s?.textContent ?? ""),
      };
    });
    check(
      "recipe disclosure uses a chevron, not faint show/hide text",
      chevron.hasSvg && !chevron.hasShowText,
      JSON.stringify(chevron),
    );
  }
  await page.close();
}

await browser.close();
console.log(failures ? `\n${failures} check(s) failing` : "\nall checks passing");
process.exit(failures ? 1 : 0);
