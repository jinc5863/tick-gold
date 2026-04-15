# 页面验证清单

## 每页必检项

### Dashboard (仪表盘)
- [ ] `text=仪表盘` 可见
- [ ] `text=XAUUSD` 可见
- [ ] `text=今日数据处理量` 可见
- [ ] `text=有效因子数` 可见
- [ ] `text=风控评级` 可见
- [ ] `text=EA策略数` 可见
- [ ] `.ant-card` 统计卡片存在
- [ ] `.recharts-wrapper` 图表存在

### Database (数据管理)
- [ ] `text=数据` 可见
- [ ] `.ant-table` 数据表格存在
- [ ] `.ant-form` 查询表单存在
- [ ] `text=导入` 或 `text=查询` 按钮存在

### DataClean (数据清洗)
- [ ] `text=清洗` 可见
- [ ] `.ant-checkbox` 清洗规则复选框存在
- [ ] `text=开始清洗` 按钮存在
- [ ] `.ant-switch` 开关存在

### Statistics (统计报表)
- [ ] `text=统计` 可见
- [ ] `.ant-statistic` 统计数值存在
- [ ] `.recharts-wrapper` 图表存在
- [ ] `text=数据质量` 或 `text=完整性` 指标存在

### FactorAnalysis (因子分析)
- [ ] `text=量化因子` 或 `text=因子分析` 可见
- [ ] `.ant-table` 因子表格存在
- [ ] `text=IC` 或 `text=IC均值` 列存在
- [ ] `text=生成策略` 按钮存在

### RiskControl (风控模块)
- [ ] `text=风控` 或 `text=风险` 可见
- [ ] `text=交易前` 或 `text=交易中` 风控层级存在
- [ ] `.ant-progress` 风险进度条存在
- [ ] `text=最大回撤` 指标存在

### EAGenerator (EA策略)
- [ ] `text=EA策略` 或 `text=策略` 可见
- [ ] `text=信号` 显示存在
- [ ] `.ant-select` 或 `.ant-checkbox` 配置选项存在
- [ ] `text=启动` 或 `text=停止` 按钮存在

### Backtesting (回测分析)
- [ ] `text=回测` 可见
- [ ] `.ant-form` 参数表单存在
- [ ] `.recharts-wrapper` 权益曲线图表存在
- [ ] `text=夏普` 或 `text=回撤` 指标存在

### AIResearch (AI研究)
- [ ] `text=AI量化研究` 标题可见
- [ ] `text=特征工程` 或 `text=模型` 标签存在
- [ ] `.recharts-wrapper` 图表存在

### Trading (交易页面)
- [ ] `text=交易` 可见
- [ ] `text=连接` 状态显示存在
- [ ] `.ant-table` 持仓表格存在
- [ ] `text=BUY` 或 `text=SELL` 方向显示存在

---

## 检测命令

```bash
# 快速健康检查（所有页面）
npx playwright test --grep="Health Check"

# 完整验证
npx playwright test

# 单页详细测试
npx playwright test --grep="Dashboard"
```
