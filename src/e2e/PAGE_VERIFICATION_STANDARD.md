# 页面验证标准

## 1. 页面加载检测

### 1.1 HTTP状态码
- [ ] 页面返回 200 状态码
- [ ] 无 404/500/502/503 错误

### 1.2 DOM加载
- [ ] `<html>` 标签存在
- [ ] `<body>` 标签存在且有内容
- [ ] React根元素 `#root` 已渲染内容

### 1.3 JavaScript错误
- [ ] 无 `pageerror` 事件触发
- [ ] 无未捕获的JavaScript异常
- [ ] 控制台无 CRITICAL/HIGH 级别错误

---

## 2. 内容完整性检测

### 2.1 必需元素检查
每个页面必须包含以下元素：

| 页面 | 必需元素 | 验证方式 |
|------|----------|----------|
| Dashboard | 标题"仪表盘"、统计数据卡片 | `text=仪表盘`, `.ant-card` |
| DataManagement/Database | 数据表格、查询表单 | `.ant-table`, `.ant-form` |
| DataClean | 清洗规则配置、开始按钮 | `.ant-checkbox`, `text=开始清洗` |
| Statistics | 统计卡片、图表 | `.ant-statistic`, `.recharts-wrapper` |
| FactorAnalysis | 因子列表、IC指标 | `.ant-table`, `text=IC` |
| RiskControl | 风控指标、三层风控显示 | `.ant-progress`, `text=交易前` |
| EAGenerator | 策略配置、信号显示 | `text=策略`, `text=信号` |
| Backtesting | 参数表单、权益曲线 | `.ant-form`, `.recharts-wrapper` |
| AIResearch | AI标题、模型选择 | `text=AI`, `text=模型` |
| Trading | 连接状态、持仓表格 | `text=连接`, `.ant-table` |

### 2.2 动态内容检测
- [ ] API数据已加载（非loading状态持续超过3秒）
- [ ] 图表已渲染（非空白占位区域）
- [ ] 表格有数据行（非空表格）

---

## 3. 功能元素检测

### 3.1 表单元素
- [ ] 输入框可聚焦并输入
- [ ] 下拉选择器可展开
- [ ] 日期选择器可选择
- [ ] 提交按钮存在且可点击

### 3.2 交互元素
- [ ] 侧边栏菜单可点击
- [ ] 卡片可展开/折叠（如有）
- [ ] 模态框可打开

### 3.3 状态显示
- [ ] Loading状态显示正确
- [ ] 错误状态显示正确
- [ ] 空状态显示正确

---

## 4. 视觉检测

### 4.1 布局
- [ ] 侧边栏显示正确
- [ ] 主内容区无溢出
- [ ] 响应式布局正常（移动端可选）

### 4.2 样式
- [ ] 暗色主题正确应用（背景#0A0A0F）
- [ ] 金色强调色显示（#CA8A04）
- [ ] 文字可读（无白屏/透明文字）

---

## 5. 路由检测

### 5.1 路由配置
- [ ] App.tsx 中所有页面都有对应路由
- [ ] 路由路径与侧边栏菜单一致
- [ ] 无重复路由

### 5.2 导航
- [ ] 点击侧边栏能跳转正确页面
- [ ] URL正确更新
- [ ] 页面刷新保持当前路由

---

## 6. API集成检测

### 6.1 后端连接
- [ ] Backend health endpoint 返回 200
- [ ] API请求返回预期数据格式

### 6.2 WebSocket（可选）
- [ ] WebSocket连接成功（非阻塞错误）
- [ ] 实时数据更新显示

---

## 7. Playwright测试模板

```typescript
import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:5174';

test.describe('页面验证标准', () => {
  
  // 1. 页面加载
  test('页面加载无崩溃', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', err => errors.push(err.message));
    
    await page.goto(`${BASE_URL}/页面路径`);
    await page.waitForTimeout(2000);
    
    // 检查无JS错误
    expect(errors.filter(e => !e.includes('WebSocket'))).toHaveLength(0);
  });

  // 2. 内容完整性
  test('必需元素存在', async ({ page }) => {
    await page.goto(`${BASE_URL}/页面路径`);
    await page.waitForTimeout(2000);
    
    // 检查页面标题
    await expect(page.locator('text=页面标题').first()).toBeVisible();
    
    // 检查关键UI元素
    const hasKeyElement = await page.locator('.ant-table, .ant-card, .recharts-wrapper').count() > 0;
    expect(hasKeyElement).toBe(true);
  });

  // 3. 功能可用
  test('表单元素可交互', async ({ page }) => {
    await page.goto(`${BASE_URL}/页面路径`);
    await page.waitForTimeout(2000);
    
    // 检查按钮可点击
    const button = page.locator('button').first();
    if (await button.count() > 0) {
      await expect(button).toBeEnabled();
    }
  });

  // 4. 路由正确
  test('路由与URL一致', async ({ page }) => {
    await page.goto(`${BASE_URL}/页面路径`);
    await page.waitForTimeout(2000);
    
    expect(page.url()).toContain('/预期路径');
  });
});
```

---

## 8. 快速验证命令

```bash
# 运行所有测试
npx playwright test

# 运行特定页面测试
npx playwright test --grep="Dashboard"

# 运行健康检查（所有页面）
npx playwright test --grep="Health Check"

# 查看详细输出
npx playwright test --reporter=list
```

---

## 9. 判定标准

### 通过条件
- [ ] 页面加载无崩溃
- [ ] 必需元素全部存在
- [ ] 功能元素可交互
- [ ] 路由配置正确

### 失败条件
- [ ] 页面返回非200状态码
- [ ] JS错误导致页面崩溃
- [ ] 必需元素缺失
- [ ] 内容为placeholder文本
