import { test, expect } from "@playwright/test";

const BASE = "http://localhost:4173/rs3-leaderboard";

/**
 * Runs against the CURRENTLY SERVED build, which predates the /pvm fix. It
 * pins down the defects being fixed and the structural facts the fix relies
 * on (sticky offset, no clipping ancestor).
 */

test("defect: filter row and tier headings are not sticky", async ({ page }) => {
  await page.goto(`${BASE}/pvm/`, { waitUntil: "networkidle" });

  const stickyAncestors = await page.evaluate(() => {
    const h3 = Array.from(document.querySelectorAll("h3")).find((n) =>
      /of \d+ open/.test(n.textContent ?? ""),
    );
    const out: string[] = [];
    let el: HTMLElement | null = h3 as HTMLElement | null;
    while (el) {
      const cs = getComputedStyle(el);
      out.push(`${el.tagName}.${el.className?.toString().slice(0, 40)} pos=${cs.position} of=${cs.overflow}`);
      el = el.parentElement;
    }
    return out;
  });
  console.log("tier heading ancestor chain:\n" + stickyAncestors.join("\n"));
  // Nothing between the tier heading and <html> is sticky, and nothing clips.
  expect(stickyAncestors.filter((s) => s.includes("pos=sticky")).length).toBe(0);
  expect(stickyAncestors.filter((s) => /of=hidden|of=clip/.test(s)).length).toBe(0);
});

test("structural: app header is sticky and 56px tall (top-14 is correct)", async ({ page }) => {
  await page.goto(`${BASE}/pvm/`, { waitUntil: "networkidle" });
  const header = page.locator("header").first();
  const box = await header.boundingBox();
  const pos = await header.evaluate((el) => getComputedStyle(el).position);
  console.log("header", pos, box?.height);
  expect(pos).toBe("sticky");
  expect(box?.height).toBe(56);
});

test("defect: kills card claims synced while /settings says local only", async ({ page }) => {
  await page.goto(`${BASE}/settings/`, { waitUntil: "networkidle" });
  await expect(page.getByText(/Local only/i).first()).toBeVisible();

  await page.goto(`${BASE}/pvm/`, { waitUntil: "networkidle" });
  const line = page.getByText(/on the board · synced/);
  await expect(line).toBeVisible();
});

test("defect: kill counts are written to an unprefixed, shared key", async ({ page }) => {
  await page.goto(`${BASE}/pvm/`, { waitUntil: "networkidle" });
  await page.locator('button[aria-label^="Increase"]').first().click();
  await page.waitForTimeout(200);
  const keys = await page.evaluate(() => {
    const raw = Object.keys(localStorage)
      .map((k) => [k, localStorage.getItem(k)] as const)
      .filter(([, v]) => v?.includes("kc:"));
    return raw.map(([k, v]) => `${k} -> ${v?.slice(0, 120)}`);
  });
  console.log("progress keys:\n" + keys.join("\n"));
  expect(keys.join("\n")).toContain('"kc:');
  expect(keys.join("\n")).not.toContain('"p:');
});

test("defect: boss grid never exceeds two columns at 1920", async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto(`${BASE}/pvm/`, { waitUntil: "networkidle" });
  const cols = await page.evaluate(() => {
    const grids = Array.from(document.querySelectorAll("section > div.grid"));
    return grids.map(
      (g) => getComputedStyle(g).gridTemplateColumns.split(" ").length,
    );
  });
  const height = await page.evaluate(() => document.body.scrollHeight);
  console.log("grid column counts", cols, "page height", height);
  expect(Math.max(...cols)).toBeLessThanOrEqual(3); // 3 = the summary/what-now rows
});
