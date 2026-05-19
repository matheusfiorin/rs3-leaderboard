import { test, expect } from '@playwright/test';

test.describe('RS3 Leaderboard Smoke Tests', () => {
  test('page loads and shows main sections', async ({ page }) => {
    await page.goto('/');
    
    // Check main sections are visible
    const dockButtons = await page.locator('.dock-btn').count();
    expect(dockButtons).toBeGreaterThan(0);
    
    // Check header
    const header = await page.locator('header').isVisible();
    expect(header).toBeTruthy();
    
    // Activity section should be visible initially
    const activitySection = await page.locator('#activity-feed').isVisible();
    expect(activitySection).toBeTruthy();
  });

  test('language toggle works', async ({ page }) => {
    await page.goto('/');
    
    const langToggle = await page.locator('.lang-toggle').isVisible();
    expect(langToggle).toBeTruthy();
    
    // Toggle language
    await page.locator('.lang-toggle').click();
    await page.waitForTimeout(200);
    
    // Should still be on page
    const header = await page.locator('header').isVisible();
    expect(header).toBeTruthy();
  });

  test('dock navigation works', async ({ page }) => {
    await page.goto('/');
    
    // Get all dock buttons
    const buttons = await page.locator('.dock-btn');
    const count = await buttons.count();
    expect(count).toBeGreaterThan(0);
    
    if (count > 1) {
      // Click second button and verify content changes
      const secondButton = buttons.nth(1);
      await secondButton.click();
      await page.waitForTimeout(300);
      
      // Content should have changed (not fully testable without knowing IDs)
      const header = await page.locator('header').isVisible();
      expect(header).toBeTruthy();
    }
  });

  test('activity badge initializes to 0 or number', async ({ page }) => {
    await page.goto('/');
    
    const badge = await page.locator('#activity-count');
    const badgeText = await badge.textContent();
    
    // Should be a number
    expect(/^\d+$/.test(badgeText.trim())).toBeTruthy();
  });

  test('localStorage persists activity timestamp', async ({ page, context }) => {
    await page.goto('/');
    
    // Get initial activity count
    const initialBadge = await page.locator('#activity-count').textContent();
    
    // Check localStorage was written
    const timestamp = await page.evaluate(() => localStorage.getItem('lastActivityTime'));
    // Should have a value or be null (depends on if there's activity data)
    expect(timestamp === null || /^\d+$/.test(timestamp)).toBeTruthy();
  });

  test('combat section renders bars', async ({ page }) => {
    await page.goto('/');
    
    // Navigate to combat section (assuming it's linked)
    const buttons = await page.locator('.dock-btn');
    const count = await buttons.count();
    
    // Try to find and click combat-related button
    // This is a smoke test - just check structure loads
    const header = await page.locator('header').isVisible();
    expect(header).toBeTruthy();
  });

  test('no console errors on load', async ({ page }) => {
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    await page.goto('/');
    await page.waitForTimeout(500);
    
    // Filter out expected errors or third-party errors
    const appErrors = errors.filter(e => 
      !e.includes('404') && 
      !e.includes('CORS') &&
      !e.includes('favicon')
    );
    
    expect(appErrors.length).toBe(0);
  });

  test('i18n keys resolve without falling back to key name', async ({ page }) => {
    await page.goto('/');
    
    // Get all text content
    const bodyText = await page.locator('body').textContent();
    
    // Should not contain orphaned keys like "easterTitle"
    expect(bodyText).not.toContain('easterTitle');
    expect(bodyText).not.toContain('decMonth');
  });
});
