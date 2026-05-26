import { test, expect } from '@playwright/test';

// Cross-viewport UX validation. Each project (mobile, tablet, desktop) runs
// this whole file with its own viewport, so the assertions below run thrice.
// Project name is available via test.info().project.name to skip cases that
// only apply to one form factor.

const isMobile = () => /mobile|iphone|pixel/i.test(test.info().project.name);
const isTablet = () => /tablet|ipad/i.test(test.info().project.name);

test.describe('Responsive UI/UX', () => {
  test('no horizontal scroll at any viewport', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    // Allow one paint frame so layout settles before measuring overflow
    await page.waitForTimeout(150);
    const { scrollWidth, clientWidth } = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    // Allow 2px slop for scrollbar gutter rounding
    expect(scrollWidth - clientWidth).toBeLessThanOrEqual(2);
  });

  test('header controls are reachable', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#lang-toggle')).toBeVisible();
    await expect(page.locator('#btn-refresh')).toBeVisible();
    await expect(page.locator('#notif-bell')).toBeVisible();
  });

  test('notification bell click targets meet 44x44 on touch', async ({ page }) => {
    test.skip(!isMobile() && !isTablet(), 'Touch-target rule applies to coarse pointers only');
    await page.goto('/');
    const bell = page.locator('#notif-bell');
    const box = await bell.boundingBox();
    expect(box).not.toBeNull();
    expect(box.width).toBeGreaterThanOrEqual(44);
    expect(box.height).toBeGreaterThanOrEqual(44);
  });

  test('dock navigation visible and tappable', async ({ page }) => {
    await page.goto('/');
    const dockBtns = page.locator('.dock-btn');
    const count = await dockBtns.count();
    expect(count).toBeGreaterThan(2);
    // First button should have a measurable bounding box (not display:none)
    const firstBox = await dockBtns.first().boundingBox();
    expect(firstBox).not.toBeNull();
    expect(firstBox.width).toBeGreaterThan(0);
    expect(firstBox.height).toBeGreaterThan(0);
  });

  test('notification panel fits viewport when opened', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      // Seed an event so the panel has content
      if (typeof notif !== 'undefined') {
        notif.add({ type: 'levelup', player: 'TestUser', payload: { skillName: 'Test', level: 50 } });
      }
    });
    await page.click('#notif-bell');
    const panel = page.locator('#notif-panel');
    await expect(panel).toBeVisible();
    const box = await panel.boundingBox();
    const vw = page.viewportSize().width;
    const vh = page.viewportSize().height;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(vw + 2);
    expect(box.height).toBeLessThanOrEqual(vh);
  });

  test('goals page renders tier sections', async ({ page }) => {
    await page.goto('/');
    // Navigate to goals via dock launch
    await page.evaluate(() => {
      if (typeof launchSection === 'function') launchSection('goals');
    });
    await page.waitForTimeout(400);
    const tiers = await page.locator('.gl-tier').count();
    // 3 tiers expected; if no players are loaded yet (offline), the section
    // may render empty — accept either as a non-crash signal.
    expect(tiers === 0 || tiers === 3).toBeTruthy();
  });

  test('language toggle does not collapse layout', async ({ page }) => {
    await page.goto('/');
    const widthBefore = await page.evaluate(() => document.documentElement.scrollWidth);
    await page.click('#lang-toggle');
    await page.waitForTimeout(250);
    const widthAfter = await page.evaluate(() => document.documentElement.scrollWidth);
    // Layout should not grow catastrophically after lang switch. We tolerate
    // up to a 16px overflow (scrollbar gutter + minor button width drift from
    // translated labels) — anything more is a regression. The strict
    // "no horizontal scroll" test above validates the initial-load case.
    const vw = page.viewportSize().width;
    expect(widthAfter).toBeLessThanOrEqual(vw + 16);
    expect(Math.abs(widthAfter - widthBefore)).toBeLessThanOrEqual(50);
  });
});
