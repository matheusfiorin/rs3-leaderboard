// Reproduces the /skills blocker against the CURRENTLY SERVED (pre-fix) build,
// so the root cause I fixed in lib/skills.ts is the one the reviewer saw.
// Run:  node .review/skills-blocker-repro.mjs
import { chromium } from "@playwright/test";

const URL = "http://localhost:4173/rs3-leaderboard/skills/";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
await page.goto(URL, { waitUntil: "networkidle" });
await page.waitForTimeout(600);

// Every progressbar on the page, with the meter value text beside it.
const meters = await page.evaluate(() => {
  const out = [];
  for (const bar of document.querySelectorAll('[role="progressbar"]')) {
    const row = bar.closest("li") || bar.parentElement;
    const value = bar.previousElementSibling?.textContent?.trim() ?? "";
    out.push({
      now: Number(bar.getAttribute("aria-valuenow")),
      value,
      row: (row?.querySelector("span")?.textContent ?? "").trim(),
    });
  }
  return out;
});

const full = meters.filter((m) => m.now === 100);
console.log(`progressbars: ${meters.length}`);
console.log(`reading 100%: ${full.length}`);
console.log("sample:", JSON.stringify(meters.slice(0, 8), null, 0));

// Labels the reviewer quoted verbatim.
const body = await page.evaluate(() => document.body.innerText);
for (const probe of ["Invention", "Constitution", "100%", "max"]) {
  console.log(`text contains ${JSON.stringify(probe)}: ${body.includes(probe)}`);
}

// h1 audit and the headline's two-figure spread at desktop.
const h1s = await page.locator("h1").count();
console.log(`h1 count (mobile): ${h1s}`);

await page.setViewportSize({ width: 1440, height: 900 });
await page.waitForTimeout(300);
const spread = await page.evaluate(() => {
  const nums = [...document.querySelectorAll("div")]
    .filter((d) => /^\d,\d{3}$/.test(d.textContent?.trim() ?? "") && d.children.length === 0)
    .map((d) => {
      const r = d.getBoundingClientRect();
      return { text: d.textContent.trim(), left: Math.round(r.left), right: Math.round(r.right) };
    });
  if (nums.length < 2) return { nums };
  return { nums, gap: nums[1].left - nums[0].right };
});
console.log("headline totals at 1440:", JSON.stringify(spread));

await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
console.log("page height at 1440:", await page.evaluate(() => document.body.scrollHeight));

await browser.close();
