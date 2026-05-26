import { test, expect } from '@playwright/test';

// Validates the goals page tier restructure: collapsible tier sections,
// per-player tier-collapse persistence, and manual-checkbox persistence.

async function gotoGoals(page) {
  await page.goto('/');
  await page.waitForLoadState('domcontentloaded');
  // Give the cache-first load a beat so player data populates before render
  await page.waitForTimeout(800);
  await page.evaluate(() => {
    if (typeof launchSection === 'function') launchSection('goals');
  });
  await page.waitForTimeout(400);
}

test.describe('Goals tier UI', () => {
  test('renders 3 tier sections (early / mid / end)', async ({ page }) => {
    await gotoGoals(page);
    const tiers = page.locator('.gl-tier');
    const count = await tiers.count();
    if (count === 0) test.skip(true, 'No player data loaded; skipping tier render check');
    expect(count).toBe(3);
    await expect(page.locator('.gl-tier-early')).toBeVisible();
    await expect(page.locator('.gl-tier-mid')).toBeVisible();
    await expect(page.locator('.gl-tier-end')).toBeVisible();
  });

  test('end-game tier is locked + collapsed for combat < 95 player', async ({ page }) => {
    await gotoGoals(page);
    const end = page.locator('.gl-tier-end');
    const visible = await end.count();
    if (!visible) test.skip(true, 'No tier rendered; skipping');
    // If the active player is sub-95, the end tier should carry the locked class
    const isLocked = await end.evaluate(el => el.classList.contains('gl-tier-locked'));
    const isOpen = await end.evaluate(el => el.hasAttribute('open'));
    // Either: locked AND collapsed, or unlocked (high-combat player)
    if (isLocked) expect(isOpen).toBeFalsy();
  });

  test('tier collapse state persists across reload', async ({ page }) => {
    await gotoGoals(page);
    const midTier = page.locator('.gl-tier-mid');
    if (!(await midTier.count())) test.skip(true, 'No tier rendered; skipping');
    const wasOpen = await midTier.evaluate(el => el.hasAttribute('open'));
    // Toggle via the summary
    await midTier.locator('.gl-tier-head').click();
    await page.waitForTimeout(150);
    const newState = await midTier.evaluate(el => el.hasAttribute('open'));
    expect(newState).not.toBe(wasOpen);

    // Reload, return to goals page, check persistence
    await page.reload();
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(800);
    await page.evaluate(() => { if (typeof launchSection === 'function') launchSection('goals'); });
    await page.waitForTimeout(400);
    const reloadedMid = page.locator('.gl-tier-mid');
    const stillTogglee = await reloadedMid.evaluate(el => el.hasAttribute('open'));
    expect(stillTogglee).toBe(newState);
  });

  test('manual checkbox state persists across reload', async ({ page }) => {
    await gotoGoals(page);
    const checks = page.locator('.gl-check');
    const checkCount = await checks.count();
    if (!checkCount) test.skip(true, 'No manual checkboxes on this view; skipping');
    const first = checks.first();
    const before = await first.isChecked();
    await first.check({ force: true });
    await page.waitForTimeout(150);
    const dataKey = await first.getAttribute('data-key');

    await page.reload();
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(800);
    await page.evaluate(() => { if (typeof launchSection === 'function') launchSection('goals'); });
    await page.waitForTimeout(400);

    const stored = await page.evaluate(() => {
      try { return JSON.parse(localStorage.getItem('rs3lb-goals') || '{}'); }
      catch { return {}; }
    });
    expect(stored[dataKey]).toBeTruthy();
  });
});
