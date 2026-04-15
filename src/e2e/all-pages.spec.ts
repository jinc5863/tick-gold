import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:5174';

test.describe('Dashboard Page', () => {
  test('should load dashboard with key elements', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`);
    await page.waitForTimeout(2000);

    await expect(page.locator('text=仪表盘').first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=XAUUSD').first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=实时行情').first()).toBeVisible({ timeout: 5000 });
  });

  test('should display stats cards', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`);
    await page.waitForTimeout(2000);

    await expect(page.locator('text=今日数据处理量').first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=有效因子数').first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=风控评级').first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=EA策略数').first()).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Data Management Pages', () => {
  test('DataImport - should load data import page with real content', async ({ page }) => {
    await page.goto(`${BASE_URL}/data-management/import`);
    await page.waitForTimeout(2000);
    // Check for real content (not placeholder)
    await expect(page.locator('text=数据导入').first()).toBeVisible({ timeout: 10000 });
    // Check for actual UI elements
    const hasUploadArea = await page.locator('text=拖拽').count() > 0 ||
                          await page.locator('button').count() > 0;
    expect(hasUploadArea).toBe(true);
  });

  test('DataClean - should load data cleaning page with real content', async ({ page }) => {
    await page.goto(`${BASE_URL}/data-management/cleaning`);
    await page.waitForTimeout(2000);
    // Check for real content
    await expect(page.locator('text=清洗').first()).toBeVisible({ timeout: 10000 });
    // Check for actual UI elements - cleaning rules should exist
    const hasRules = await page.locator('.ant-checkbox-wrapper, .ant-switch').count() > 0;
    expect(hasRules).toBe(true);
  });

  test('Database - should load database page with real content', async ({ page }) => {
    await page.goto(`${BASE_URL}/data-management`);
    await page.waitForTimeout(2000);
    // Check for real content
    await expect(page.locator('text=数据').first()).toBeVisible({ timeout: 10000 });
    // Check for actual table or list
    const hasTable = await page.locator('.ant-table, table, .ant-list').count() > 0;
    expect(hasTable).toBe(true);
  });

  test('Statistics - should load statistics page with real content', async ({ page }) => {
    await page.goto(`${BASE_URL}/data-management/statistics`);
    await page.waitForTimeout(2000);
    // Check for real content
    await expect(page.locator('text=统计').first()).toBeVisible({ timeout: 10000 });
    // Check for charts or metrics
    const hasCharts = await page.locator('.recharts-wrapper, .ant-statistic').count() > 0;
    expect(hasCharts).toBe(true);
  });
});

test.describe('Factor Analysis Page', () => {
  test('should load factor analysis page with real content', async ({ page }) => {
    await page.goto(`${BASE_URL}/factor-analysis`);
    await page.waitForTimeout(2000);

    await expect(page.locator('text=量化因子').first()).toBeVisible({ timeout: 10000 });
    // Check for actual table with data
    const hasTable = await page.locator('.ant-table').count() > 0;
    expect(hasTable).toBe(true);
  });
});

test.describe('Risk Control Page', () => {
  test('should load risk control page with real content', async ({ page }) => {
    await page.goto(`${BASE_URL}/risk-control`);
    await page.waitForTimeout(2000);

    await expect(page.locator('text=风控').first()).toBeVisible({ timeout: 10000 });
    // Check for actual risk metrics or controls
    const hasRiskContent = await page.locator('.ant-card, .ant-statistic, .ant-progress').count() > 0;
    expect(hasRiskContent).toBe(true);
  });
});

test.describe('EA Generator Page', () => {
  test('should load EA generator page', async ({ page }) => {
    await page.goto(`${BASE_URL}/ea-generator`);
    await page.waitForTimeout(2000);

    await expect(page.locator('text=EA策略').first()).toBeVisible({ timeout: 10000 });
  });

  test('should display strategy configuration', async ({ page }) => {
    await page.goto(`${BASE_URL}/ea-generator`);
    await page.waitForTimeout(2000);

    await expect(page.locator('text=策略').first()).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Backtesting Page', () => {
  test('should load backtesting page', async ({ page }) => {
    await page.goto(`${BASE_URL}/backtesting`);
    await page.waitForTimeout(2000);

    await expect(page.locator('text=回测').first()).toBeVisible({ timeout: 10000 });
  });

  test('should display backtest parameters', async ({ page }) => {
    await page.goto(`${BASE_URL}/backtesting`);
    await page.waitForTimeout(2000);

    await expect(page.locator('text=参数').first()).toBeVisible({ timeout: 5000 });
  });
});

test.describe('AI Research Page', () => {
  test('should load AI research page with real content', async ({ page }) => {
    await page.goto(`${BASE_URL}/ai-research`);
    await page.waitForTimeout(2000);

    await expect(page.locator('text=AI量化研究').first()).toBeVisible({ timeout: 10000 });
    // Check for actual AI content
    const hasAIContent = await page.locator('.ant-card, .recharts-wrapper').count() > 0;
    expect(hasAIContent).toBe(true);
  });
});

test.describe('Trading Page', () => {
  test('should load trading page', async ({ page }) => {
    await page.goto(`${BASE_URL}/trading`);
    await page.waitForTimeout(2000);

    await expect(page.locator('text=交易').first()).toBeVisible({ timeout: 10000 });
  });

  test('should display connection status', async ({ page }) => {
    await page.goto(`${BASE_URL}/trading`);
    await page.waitForTimeout(2000);

    await expect(page.locator('text=连接').first()).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Kline Panel Page', () => {
  test('should load kline panel page', async ({ page }) => {
    await page.goto(`${BASE_URL}/kline-panel`);
    await page.waitForTimeout(2000);

    await expect(page.locator('text=K线面板').first()).toBeVisible({ timeout: 10000 });
  });

  test('should display kline indicators', async ({ page }) => {
    await page.goto(`${BASE_URL}/kline-panel`);
    await page.waitForTimeout(2000);

    await expect(page.locator('text=MA').first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=MACD').first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=RSI').first()).toBeVisible({ timeout: 5000 });
  });
});

test.describe('All Pages Health Check', () => {
  const pages = [
    { url: '/dashboard', name: 'Dashboard' },
    { url: '/data-management', name: 'Data Management' },
    { url: '/data-clean', name: 'Data Clean' },
    { url: '/factor-analysis', name: 'Factor Analysis' },
    { url: '/risk-control', name: 'Risk Control' },
    { url: '/ea-generator', name: 'EA Generator' },
    { url: '/backtesting', name: 'Backtesting' },
    { url: '/ai-research', name: 'AI Research' },
    { url: '/trading', name: 'Trading' },
    { url: '/kline-panel', name: 'Kline Panel' },
  ];

  for (const p of pages) {
    test(`${p.name} (${p.url}) should load without crash`, async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', err => errors.push(err.message));

      await page.goto(`${BASE_URL}${p.url}`);
      await page.waitForTimeout(2000);

      // Page should have content
      const body = await page.locator('body');
      expect(await body.innerText()).toBeTruthy();

      // No critical JS errors
      const criticalErrors = errors.filter(e =>
        !e.includes('WebSocket') &&
        !e.includes('ws://') &&
        !e.includes('connection') &&
        !e.includes('ERR_')
      );
      expect(criticalErrors).toHaveLength(0);
    });
  }
});
