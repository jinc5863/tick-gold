# Tick Gold子代理系统快速指南

## 核心代理命令

### 主协调代理
```bash
# 启动完整开发工作流
/agent gold-trading-orchestrator "开始新黄金策略开发"

# 性能优化工作流
/agent gold-trading-orchestrator "启动系统性能优化"
```

### 黄金交易专家
```bash
# 黄金特性咨询
/agent gold-trading-specialist "验证新策略的黄金特性"

# 风险参数检查
/agent gold-trading-specialist "检查跳空风险和隔夜风险控制"
```

### 性能监控代理
```bash
# 性能基准测试
/agent performance-monitoring-agent "执行21,340+ ticks/sec性能测试"

# 延迟监控
/agent performance-monitoring-agent "监控<50ms延迟目标"
```

## 常用ECC命令

### 完整工作流
```bash
# 启动黄金交易完整开发工作流
/ecc:multi-workflow --name "gold-trading-complete-dev"

# 性能优化代理组
/ecc:multi-plan --tags "performance,gold,trading"
```

### 组件开发
```bash
# 前端组件开发
/ecc:multi-frontend --react --typescript --antd

# 后端量化开发
/ecc:multi-backend --python --fastapi --quant
```

## 性能测试命令

### 关键性能测试
```bash
# 21,340+ ticks/sec测试
python -m pytest tests/performance/test_throughput.py -v

# <50ms延迟测试
python -m pytest tests/performance/test_latency.py -v

# 98.7%+数据质量测试
python -m pytest tests/quality/test_data_quality.py -v
```

### 黄金特性测试
```bash
# 1%跳空风险测试
python -m pytest tests/unit/test_gold_data.py -k "test_gap_risk_1percent"

# 0.5%隔夜风险测试
python -m pytest tests/unit/test_risk.py -k "test_overnight_risk_0.5percent"

# 亚盘时段过滤测试
python -m pytest tests/unit/test_gold_data.py -k "test_asian_session_filter"
```

## 故障排除

### 代理问题
```bash
# 检查代理配置
ls -la /Users/office01/.claude/agents/

# 检查代理健康状态
./scripts/orchestrate-gold-agents.sh --health-check
```

### 性能问题
```bash
# 快速性能诊断
/agent performance-monitoring-agent "诊断性能瓶颈"

# 数据库性能检查
/database-reviewer --diagnose --timescaledb

# Python性能剖析
python -m cProfile -o profile.stats main.py
```

## 监控指南

### 实时监控
- 查看日志: `tail -f logs/agents/latest.log`
- 性能监控: 访问实时监控面板
- 代理状态: 查看agent_status.json

### 定期检查
- 每日性能健康检查
- 每周黄金特性验证
- 每月性能基准测试
```

### 日志管理
- 代理日志: `logs/agents/`
- 性能报告: `reports/performance/`
- 监控数据: `logs/monitoring/`

## 维护建议

### 日常维护
1. 每日检查代理健康状态
2. 监控性能指标趋势
3. 定期更新代理配置

### 升级维护
1. 备份现有配置
2. 逐步测试新版本
3. 验证黄金特性保持

---
**最后更新**: $(date)
**系统版本**: 1.0.0
**适用项目**: Tick Gold XAUUSD量化交易系统
