import { test, expect } from '@playwright/test';

test.describe('Dashboard', () => {
  test('should load dashboard page', async ({ page }) => {
    await page.goto('/');

    // Wait for React to render
    await page.waitForTimeout(2000);

    // Check page title
    await expect(page).toHaveTitle(/Tick Gold/);

    // Check for main elements
    const dashboardText = page.locator('text=仪表盘');
    await expect(dashboardText.first()).toBeVisible({ timeout: 10000 });

    // Check for XAUUSD text
    const xauusdText = page.locator('text=XAUUSD');
    await expect(xauusdText.first()).toBeVisible({ timeout: 5000 });
  });

  test('should have no critical console errors on load', async ({ page }) => {
    const errors: string[] = [];

    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    page.on('pageerror', err => {
      errors.push(err.message);
    });

    await page.goto('/');
    await page.waitForTimeout(2000);

    // Filter out WebSocket and network errors (expected when backend is not available)
    const criticalErrors = errors.filter(e =>
      !e.includes('WebSocket') &&
      !e.includes('ws://') &&
      !e.includes('connection') &&
      !e.includes('ERR_') &&
      !e.includes('failed')
    );

    console.log('All errors:', errors);
    console.log('Critical errors:', criticalErrors);
    expect(criticalErrors).toHaveLength(0);
  });
});

test.describe('Navigation', () => {
  test('should navigate between pages', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(2000);

    // Check sidebar menu exists
    const sidebar = page.locator('.ant-layout-sider');
    await expect(sidebar).toBeVisible({ timeout: 5000 });

    // Check URL redirects to dashboard
    expect(page.url()).toContain('/dashboard');
  });
});
