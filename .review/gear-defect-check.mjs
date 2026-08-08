// Confirms, against the CURRENTLY SERVED (pre-fix) build, the three /gear
// defects I am fixing: the ring parked ~700px from its row content, the
// inverted table column widths, and the ladder's bare "N to go" gate readout.
import { chromium } from "@playwright/test";

const URL = "http://localhost:4173/rs3-leaderboard/gear/";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto(URL, { waitUntil: "networkidle" });
await page.waitForTimeout(1500);

// 1. h1 present?
console.log("h1 count:", await page.locator("h1").count());

// 2. player switcher shape
const switcher = page.locator('[role="group"][aria-label="Player"]');
console.log("shared Segmented player switcher present:", await switcher.count());

// 3. gap between rightmost content and the ring in each upgrade row
const rows = page.locator("ol > li");
const n = await rows.count();
for (let i = 0; i < n; i++) {
  const row = rows.nth(i);
  const ring = row.locator('[role="img"]');
  if (!(await ring.count())) continue;
  const rb = await ring.first().boundingBox();
  const texts = row.locator("p, span, a");
  let maxRight = 0;
  const tn = await texts.count();
  for (let j = 0; j < tn; j++) {
    const b = await texts.nth(j).boundingBox();
    if (b && b.x + b.width < rb.x) maxRight = Math.max(maxRight, b.x + b.width);
  }
  console.log(`upgrade row ${i + 1}: ring.x=${Math.round(rb.x)} content ends ${Math.round(maxRight)} -> void ${Math.round(rb.x - maxRight)}px`);
}

// 4. table column widths
const ths = page.locator("table thead th");
const widths = [];
for (let i = 0; i < (await ths.count()); i++) {
  const b = await ths.nth(i).boundingBox();
  widths.push(`${(await ths.nth(i).innerText()).trim()}=${Math.round(b.width)}`);
}
console.log("table columns:", widths.join(" "));

// 5. what a ladder gate cell actually says
const gateCell = page.locator("table tbody tr td:nth-child(5)").first();
console.log("first gate cell text:", JSON.stringify((await gateCell.innerText()).trim()));

console.log("page height:", await page.evaluate(() => document.body.scrollHeight));

await browser.close();
