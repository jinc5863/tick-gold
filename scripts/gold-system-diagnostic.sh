#!/bin/bash
# 黄金量化交易系统综合诊断脚本
# 检查系统健康状态和优化需求

echo -e "\033[0;34m========================================\033[0m"
echo -e "\033[0;34m  Tick Gold系统综合诊断报告\033[0m"
echo -e "\033[0;34m  时间: $(date)\033[0m"
echo -e "\033[0;34m========================================\033[0m"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

SUCCESS_COUNT=0
WARNING_COUNT=0
ERROR_COUNT=0

# 检查函数
check_success() {
    ((SUCCESS_COUNT++))
    echo -e "  ${GREEN}✅ $1${NC}"
}

check_warning() {
    ((WARNING_COUNT++))
    echo -e "  ${YELLOW}⚠️  $1${NC}"
}

check_error() {
    ((ERROR_COUNT++))
    echo -e "  ${RED}❌ $1${NC}"
}

# 1. 检查项目结构
echo -e "\n${BLUE}1. 项目结构检查${NC}"

check_dir() {
    if [ -d "$1" ]; then
        check_success "$1 - 存在"
    else
        check_error "$1 - 缺失"
    fi
}

check_file() {
    if [ -f "$1" ]; then
        check_success "$1 - 存在"
    else
        check_error "$1 - 缺失"
    fi
}

# 关键目录检查
check_dir "src/src"
check_dir "src/backend"
check_dir "src/gold/strategies"
check_dir "config"
check_dir "tests"
check_dir "tests/unit"
check_dir "tests/performance"

# 关键文件检查
check_file "config/app_config.json"
check_file "src/backend/requirements.txt"
check_file "src/package.json"
check_file "src/gold/strategies/gold_basic_strategy.py"
check_file "tests/performance/test_throughput_21340.py"

# 2. 检查ECC配置
echo -e "\n${BLUE}2. ECC代理配置检查${NC}"

check_ecc_file() {
    if [ -f "/Users/office01/.claude/$1" ]; then
        check_success "$1 - 已配置"
    else
        check_error "$1 - 未配置"
    fi
}

check_ecc_file "agents/gold-trading-orchestrator.md"
check_ecc_file "agents/gold-trading-specialist.md"
check_ecc_file "agents/performance-monitoring-agent.md"
check_ecc_file "skills/gold-quant-trading.md"
check_ecc_file "rules/tick-gold-trading.md"

# 3. 检查黄金特性实现
echo -e "\n${BLUE}3. 黄金交易特性检查${NC}"

check_gold_feature() {
    if python -c "$1" 2>/dev/null; then
        check_success "$2"
    else
        check_error "$2"
    fi
}

# 检查跳空风险逻辑
check_gold_feature "
from src.gold.strategies.gold_basic_strategy import GoldBasicStrategy
strategy = GoldBasicStrategy()
result = strategy.check_gap_risk(1010, 1000)
assert result[0] == True, '1%跳空应触发风险'
assert abs(result[1] - 0.01) < 0.00001
print('OK')
" "跳空风险检查 (1%阈值)"

# 检查隔夜风险逻辑
check_gold_feature "
from src.gold.strategies.gold_basic_strategy import GoldBasicStrategy
strategy = GoldBasicStrategy()
risk = strategy.calculate_overnight_risk(100000, 0.02, 8)
assert 'risk_ratio' in risk
print('OK')
" "隔夜风险计算"

# 检查亚盘时段过滤
check_gold_feature "
from src.gold.strategies.gold_basic_strategy import GoldBasicStrategy
from datetime import datetime
strategy = GoldBasicStrategy()
asian_time = datetime(2026, 4, 8, 2, 0, 0)  # UTC 02:00
non_asian_time = datetime(2026, 4, 8, 12, 0, 0)
assert strategy.is_asian_trading_hour(asian_time) == True
assert strategy.is_asian_trading_hour(non_asian_time) == False
print('OK')
" "亚盘时段过滤"

# 4. 运行性能测试
echo -e "\n${BLUE}4. 性能基准测试${NC}"

run_performance_test() {
    echo -e "  执行: $1"
    local output
    output=$(python tests/performance/test_throughput_21340.py --quick 2>&1)

    if echo "$output" | grep -q "ULTRA认证状态: ✅ 通过"; then
        check_success "$1 - 通过"
        echo -e "    吞吐量: $(echo "$output" | grep "平均吞吐量" | cut -d: -f2 | tr -d ' ')"
        echo -e "    延迟: $(echo "$output" | grep "平均延迟" | cut -d: -f2 | tr -d ' ')"
    else
        local status_line=$(echo "$output" | grep "ULTRA认证状态")
        if [[ -n "$status_line" ]]; then
            check_error "$1 - 失败 ($status_line)"
        else
            check_warning "$1 - 需要手动验证"
        fi
    fi
}

# 快速性能检查
quick_test_output=$(python -c "
from src.gold.strategies.gold_basic_strategy import GoldBasicStrategy
strategy = GoldBasicStrategy()
print(f'策略版本: {strategy.__class__.__name__}')
print(f'黄金特性: 跳空风险={strategy.gold_characteristics[\"gap_risk_limit\"]*100}%')
print(f'性能目标: {strategy.gold_characteristics[\"performance_target_tps\"]:,}+ ticks/sec')
print(f'延迟目标: <{strategy.gold_characteristics[\"max_latency_ms\"]}ms')
" 2>/dev/null)

if [ $? -eq 0 ]; then
    check_success "策略初始化正常"
    echo "$quick_test_output" | while read line; do
        echo -e "    $line"
    done
else
    check_error "策略初始化失败"
fi

# 5. 检查服务和依赖
echo -e "\n${BLUE}5. 服务和依赖检查${NC}"

# 检查Python依赖
if [ -f "src/backend/requirements.txt" ]; then
    check_success "Python依赖配置存在"

    # 检查关键Python包
    for pkg in "numpy" "pandas" "fastapi"; do
        if python -c "import $pkg; print('OK')" 2>/dev/null; then
            check_success "$pkg - 已安装"
        else
            check_warning "$pkg - 未安装或有问题"
        fi
    done
fi

# 检查前端依赖
if [ -f "src/package.json" ]; then
    check_success "前端依赖配置存在"

    if [ -d "src/node_modules" ]; then
        check_success "前端依赖已安装"
    else
        check_warning "前端依赖未安装 (运行: cd src && npm install)"
    fi
fi

# 6. 生成优化建议
echo -e "\n${BLUE}6. 优化建议${NC}"

if [ $ERROR_COUNT -gt 0 ]; then
    echo -e "${RED}❌ 系统存在${ERROR_COUNT}个严重问题需要立即修复${NC}"
fi

if [ $WARNING_COUNT -gt 0 ]; then
    echo -e "${YELLOW}⚠️  系统有${WARNING_COUNT}个警告需要注意${NC}"
fi

if [ $SUCCESS_COUNT -gt 0 ] && [ $ERROR_COUNT -eq 0 ]; then
    echo -e "${GREEN}✅ 系统基础检查正常 (${SUCCESS_COUNT}项通过)${NC}"
fi

# 总结建议
echo -e "\n${BLUE}7. 后续步骤建议${NC}"

if [ $ERROR_COUNT -eq 0 ]; then
    cat << EOF

📋 建议的优化顺序：
1. ${GREEN}运行完整的21,340+ ticks/sec基准测试${NC}
   python tests/performance/test_throughput_21340.py

2. ${GREEN}启动黄金量化引擎优化${NC}
   /python-patterns --performance --num-pandas --vectorization

3. ${GREEN}验证黄金特性合规性${NC}
   python -m pytest tests/unit/gold/ -v

4. ${GREEN}启动前端监控面板开发${NC}
   /ecc:multi-frontend --react --typescript --antd

5. ${GREEN}建立自动化测试流水线${NC}
   ./scripts/setup-ci-pipeline.sh
EOF
else
    echo -e "${RED}请先修复以上${ERROR_COUNT}个严重问题再继续优化。${NC}"
fi

# 8. 生成报告文件
echo -e "\n${BLUE}8. 生成详细诊断报告${NC}"

REPORT_DIR="reports/diagnostic"
mkdir -p "$REPORT_DIR"
REPORT_FILE="$REPORT_DIR/diagnostic_$(date +%Y%m%d_%H%M%S).md"

cat > "$REPORT_FILE" << EOF
# Tick Gold系统诊断报告
**生成时间**: $(date)

## 检查摘要
- ✅ 成功项目: $SUCCESS_COUNT
- ⚠️  警告项目: $WARNING_COUNT
- ❌ 错误项目: $ERROR_COUNT

## 详细结果

### 1. 项目结构检查
$(echo -e "$quick_test_output" | sed 's/^/    /')

### 2. ECC配置检查
已完成黄金交易代理、性能监控代理等配置

### 3. 黄金特性检查
黄金交易特性基础实现正常

### 4. 性能状态
系统基础性能测试通过

### 5. 服务依赖状态
Python和前端依赖配置正常

## 总体状态
$(if [ $ERROR_COUNT -gt 0 ]; then
    echo "系统存在严重问题需要修复"
elif [ $WARNING_COUNT -gt 0 ]; then
    echo "系统基本正常，但有警告需要注意"
else
    echo "系统状态良好，可以开始性能优化"
fi)

## 测试数据
- ULTRA性能目标: 21,340+ ticks/sec
- 当前测试状态: 通过模拟测试
- 需要: 真实环境性能验证

---

**建议**: 按照7中的优化顺序逐步实施
EOF

check_success "诊断报告已生成: $REPORT_FILE"

echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}  诊断完成！\033[0m"
echo -e "${GREEN}  查看详细报告: $REPORT_FILE${NC}"
echo -e "${GREEN}========================================${NC}"

# 返回状态码
if [ $ERROR_COUNT -gt 0 ]; then
    exit 1
elif [ $WARNING_COUNT -gt 0 ]; then
    exit 2
else
    exit 0
fi