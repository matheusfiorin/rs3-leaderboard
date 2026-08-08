// Confirms, against the CURRENTLY SERVED build (pre-fix), the two /goals
// blockers: (1) the tier ribbon + section rails do not react to the player
// switcher, (2) manual ticks are written to unprefixed, shared keys.
import { chromium } from "@playwright/test";

const URL = "http://localhost:4173/rs3-leaderboard/goals/";

const read = async (page) => ({
  tiles: await page.$$eval("main button", (bs) =>
    bs
      .filter((b) => b.querySelector('[role="img"]'))
      .map((b) => b.innerText.replace(/\s+/g, " ").trim())
      .slice(0, 5),
  ),
  rails: await page.$$eval("main section h3, main section h2", (hs) =>
    hs.map((h) => h.innerText.replace(/\s+/g, " ").trim()),
  ),
  headings: await page.$$eval("main h1, main h2", (hs) =>
    hs.map((h) => `${h.tagName} ${h.innerText.trim().slice(0, 40)}`),
  ),
  cards: await page.$$eval("main section [role='img']", (rs) =>
    rs.map((r) => r.getAttribute("aria-label")).slice(0, 6),
  ),
});

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto(URL, { waitUntil: "networkidle" });
await page.waitForTimeout(1500);

const names = await page.$$eval("main [role='group'] button, main button", (bs) =>
  bs.map((b) => b.innerText.trim()).filter((t) => /^(Decxus|Soclopata)$/.test(t)),
);
console.log("player buttons:", names);

const before = await read(page);
console.log("BEFORE switch  tiles:", before.tiles);
console.log("BEFORE switch  rails:", before.rails);
console.log("headings:", before.headings);

await page.getByRole("button", { name: "Soclopata", exact: true }).first().click();
await page.waitForTimeout(1200);
const after = await read(page);
console.log("AFTER  switch  tiles:", after.tiles);
console.log("AFTER  switch  rails:", after.rails);
console.log("card rings (selected player):", after.cards);

console.log(
  "tiles reacted to switcher:",
  JSON.stringify(before.tiles) !== JSON.stringify(after.tiles),
);
console.log(
  "rails reacted to switcher:",
  JSON.stringify(before.rails) !== JSON.stringify(after.rails),
);

// Tick the first manual checkbox and dump the storage key it wrote.
const summary = page.locator("main section details summary").first();
await summary.click();
const box = page.locator("main section details input[type=checkbox]").first();
if (await box.count()) {
  await box.click({ force: true });
  await page.waitForTimeout(300);
  const keys = await page.evaluate(() => {
    try {
      const raw = JSON.parse(localStorage.getItem("sexta-era:progress") || "{}");
      return Object.keys(raw.entries || {});
    } catch {
      return ["<unreadable>"];
    }
  });
  console.log("progress keys after ticking:", keys);
  console.log("player-scoped:", keys.some((k) => k.startsWith("p:")));
}

// Solitary-card holes: measure each tier grid's row occupancy.
const grids = await page.$$eval("main section > div.grid", (gs) =>
  gs.map((g) => ({
    children: g.children.length,
    childWidths: [...g.children].map((c) => Math.round(c.getBoundingClientRect().width)),
    gridWidth: Math.round(g.getBoundingClientRect().width),
  })),
);
console.log("tier grids:", JSON.stringify(grids));

await browser.close();
