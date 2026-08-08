import { test, expect } from "@playwright/test";

const URL = "http://localhost:4173/rs3-leaderboard/";

test("hero leads with the scoreline, not a cross-player sum", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await page.goto(URL, { waitUntil: "networkidle" });

  const body = await page.locator("body").innerText();
  // "Total level 4,635" described neither player.
  expect(body).not.toMatch(/combined/i);
  expect(body).toMatch(/Scoreline/i);
  expect(body).toMatch(/leads/i);

  // The verdict has to be above the fold: the first h2 starts below it.
  const firstH2 = await page.locator("main h2").first().boundingBox();
  const scoreline = await page.getByText(/^Scoreline$/).boundingBox();
  expect(scoreline!.y).toBeLessThan(740);
  expect(scoreline!.y).toBeLessThan(firstH2!.y);
});

test("exactly one h1, and no horizontal page scroll at 360px", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await page.goto(URL, { waitUntil: "networkidle" });
  await expect(page.locator("h1")).toHaveCount(1);
  const { sw, iw } = await page.evaluate(() => ({
    sw: document.documentElement.scrollWidth,
    iw: window.innerWidth,
  }));
  expect(sw).toBeLessThanOrEqual(iw);
});

test("hero stat values share a baseline at 360px", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await page.goto(URL, { waitUntil: "networkidle" });
  // Per-player stat blocks: each player's three values must line up with the
  // matching value in the other player's block.
  const tops = await page.evaluate(() => {
    // Scoped to the hero: the same three labels also appear in the War Room
    // cards further down, where they are not meant to share a baseline.
    const hero = document.querySelector("main section");
    const labels = ["Total level", "Total XP", "Quests"];
    const out: Record<string, number[]> = {};
    for (const l of labels) {
      out[l] = [...(hero?.querySelectorAll("div") ?? [])]
        .filter((d) => d.textContent?.trim() === l && d.className.includes("min-h-"))
        .map((d) => Math.round(d.nextElementSibling!.getBoundingClientRect().top));
    }
    return out;
  });
  for (const [label, ys] of Object.entries(tops)) {
    expect(ys.length, `${label} appears for both players`).toBeGreaterThan(1);
    expect(Math.max(...ys) - Math.min(...ys), `${label} baselines`).toBeLessThanOrEqual(1);
  }
});

test("the memorial chip is labelled, not a bare crowned badge", async ({ page }) => {
  await page.goto(URL, { waitUntil: "networkidle" });
  // Scoped to main: the sidebar already has an "In Memoriam" nav item, so an
  // unscoped locator passes even when the hero chip is a bare crowned badge.
  const link = page.locator('main a[href*="/archive"]').first();
  await expect(link).toContainText(/in memoriam/i);
  await expect(link).toContainText(/fiorovizk/i);
});

test("Tonight's board columns end where their content ends", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(URL, { waitUntil: "networkidle" });
  // Equal heights alone do not prove the defect: measure the empty tail below
  // each card's last piece of content. The pre-fix build left ~330px of blank
  // bordered card under the player with fewer level gates.
  const tails = await page.evaluate(() => {
    const h2 = [...document.querySelectorAll("main h2")].find((h) =>
      /Tonight/.test(h.textContent ?? ""),
    );
    const grid = h2?.closest("section")?.querySelector(":scope > div");
    if (!grid) return [];
    return [...grid.children].map((card) => {
      const cb = card.getBoundingClientRect().bottom;
      let lowest = card.getBoundingClientRect().top;
      for (const el of card.querySelectorAll("*")) {
        const r = el.getBoundingClientRect();
        if (r.height > 0 && r.width > 0) lowest = Math.max(lowest, r.bottom);
      }
      return Math.round(cb - lowest);
    });
  });
  expect(tails.length).toBeGreaterThan(1);
  for (const t of tails) expect(t, "empty tail below card content").toBeLessThan(48);
});

test("expanding a requirement list does not navigate away", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(URL, { waitUntil: "networkidle" });
  const more = page.getByRole("button", { name: /\+\d+ more/ }).first();
  if (await more.count()) {
    await more.click();
    await page.waitForTimeout(300);
    expect(new URL(page.url()).pathname).toBe("/rs3-leaderboard/");
  }
});

test("the ticker says each thing once and offers a live filter", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(URL, { waitUntil: "networkidle" });
  const body = await page.locator("main").innerText();
  expect(body).not.toMatch(/I levelled my .+ skill, I am now level/);
  const filter = page.getByRole("group", { name: /filter activity/i });
  await expect(filter).toBeVisible();
  const pressed = filter.locator('[aria-pressed="true"]');
  await expect(pressed).toHaveCount(1);
});
