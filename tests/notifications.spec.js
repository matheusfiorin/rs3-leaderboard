import { test, expect } from '@playwright/test';

// Validates the notification system: today-only listing, persistent dedup
// via seen-set, panel UX. Runs across all configured projects (mobile/tablet/
// desktop), so the assertions below have to pass on every viewport.

test.describe('Notifications', () => {
  test.beforeEach(async ({ page }) => {
    // Block the data/*.json fetches so the app never seeds activity-feed
    // notifications during page load. Tests can then drive notif.add()
    // directly and assert against a clean slate.
    await page.route('**/data/*.json', (route) => {
      const url = route.request().url();
      if (/profile/.test(url)) {
        return route.fulfill({ contentType: 'application/json', body: JSON.stringify({
          skillvalues: [], questscomplete: 0, questsstarted: 0, questsnotstarted: 0, activities: [],
        })});
      }
      if (/hiscores/.test(url)) {
        return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ skills: [], activities: [] })});
      }
      if (/quests/.test(url)) {
        return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ quests: [] })});
      }
      return route.fulfill({ contentType: 'application/json', body: '{}' });
    });
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    // Guarantee empty notif slate after the initial render runs once.
    await page.evaluate(() => {
      if (typeof notif !== 'undefined' && notif.clearAll) notif.clearAll();
      if (typeof notif !== 'undefined' && notif.updateBadge) notif.updateBadge();
    });
  });

  test('bell badge hidden when no events', async ({ page }) => {
    const badge = page.locator('#notif-count');
    await expect(badge).toBeHidden();
  });

  test('add event increments badge', async ({ page }) => {
    await page.evaluate(() => {
      notif.add({ type: 'levelup', player: 'Decxus', payload: { skillName: 'Necromancy', level: 80 } });
    });
    await expect(page.locator('#notif-count')).toBeVisible();
    await expect(page.locator('#notif-count')).toHaveText('1');
  });

  test('opening panel marks events seen and clears badge', async ({ page }) => {
    await page.evaluate(() => {
      notif.add({ type: 'levelup', player: 'Decxus', payload: { skillName: 'Necromancy', level: 80 } });
      notif.add({ type: 'quest', player: 'Decxus', payload: { questName: 'Plague\'s End' } });
    });
    await expect(page.locator('#notif-count')).toHaveText('2');
    await page.click('#notif-bell');
    await expect(page.locator('#notif-panel')).toBeVisible();
    // Allow the 600ms markAllSeen tick to fire
    await page.waitForTimeout(900);
    await expect(page.locator('#notif-count')).toBeHidden();
  });

  test('reload after add does not re-toast and does not duplicate', async ({ page }) => {
    await page.evaluate(() => {
      notif.add({ type: 'levelup', player: 'Decxus', payload: { skillName: 'Necromancy', level: 80 } });
    });
    await page.reload();
    await page.waitForLoadState('domcontentloaded');

    // Second add of the same event must be a no-op (returns false)
    const isDup = await page.evaluate(() => {
      return notif.add({ type: 'levelup', player: 'Decxus', payload: { skillName: 'Necromancy', level: 80 } }) === false;
    });
    expect(isDup).toBeTruthy();

    // todayList still has exactly one matching event
    const todayCount = await page.evaluate(() => notif.todayList().filter(e => e.type === 'levelup').length);
    expect(todayCount).toBe(1);
  });

  test('seen events survive reload', async ({ page }) => {
    await page.evaluate(() => {
      notif.add({ type: 'levelup', player: 'Decxus', payload: { skillName: 'Necromancy', level: 81 } });
      notif.markAllSeen();
    });
    await expect(page.locator('#notif-count')).toBeHidden();
    await page.reload();
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('#notif-count')).toBeHidden();
  });

  test('panel shows empty state when no events', async ({ page }) => {
    await page.click('#notif-bell');
    await expect(page.locator('#notif-panel')).toBeVisible();
    await expect(page.locator('.notif-empty')).toBeVisible();
  });

  test('Escape key closes panel', async ({ page }) => {
    await page.click('#notif-bell');
    await expect(page.locator('#notif-panel')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('#notif-panel')).toBeHidden();
  });

  test('stale (non-today) events do not appear in panel', async ({ page }) => {
    await page.evaluate(() => {
      const dayAgo = Date.now() - 36 * 60 * 60 * 1000;
      notif.add({ type: 'levelup', player: 'Decxus', ts: dayAgo, payload: { skillName: 'Necromancy', level: 79 } });
    });
    const count = await page.evaluate(() => notif.todayList().length);
    expect(count).toBe(0);
    await expect(page.locator('#notif-count')).toBeHidden();
  });
});
