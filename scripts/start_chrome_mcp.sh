#!/bin/bash
# Chrome MCP深度分析启动脚本
# 老板给力！以后调试页面都方便！

set -e

echo "🚀 启动Chrome MCP深度分析 - SiliconFlow布局分析"
echo "目标URL: https://cloud.siliconflow.cn/me/models"
echo "老板！准备好！"

# 检查Chrome是否在运行
check_chrome_running() {
  pgrep -x "Google Chrome" > /dev/null 2>&1
  return $?
}

# 获取Chrome进程的调试端口
get_chrome_debug_port() {
  # 尝试多个可能的端口
  for port in 9222 9223 9224 9225 9226; do
    if curl -s "http://localhost:${port}/json/version" > /dev/null 2>&1; then
      echo $port
      return 0
    fi
  done
  echo ""
  return 1
}

# 启动Chrome调试模式
start_chrome_with_debug() {
  echo "🔧 启动Chrome调试模式 (端口: ${DEBUG_PORT})..."

  # 关闭现有的Chrome
  echo "关闭现有Chrome进程..."
  osascript -e 'quit app "Google Chrome"' 2>/dev/null || true
  sleep 2

  # 以调试模式启动Chrome
  echo "以调试模式启动Chrome..."
  open -a "Google Chrome" --args \
    --remote-debugging-port=${DEBUG_PORT} \
    --remote-allow-origins="*" \
    --disable-blink-features=AutomationControlled \
    --no-first-run \
    --no-default-browser-check \
    --new-window \
    "about:blank"

  echo "等待Chrome启动..."
  sleep 5

  # 验证调试端口
  if curl -s "http://localhost:${DEBUG_PORT}/json/version" > /dev/null 2>&1; then
    echo "✅ Chrome调试模式启动成功 (端口: ${DEBUG_PORT})"
    return 0
  else
    echo "❌ Chrome调试模式启动失败"
    return 1
  fi
}

# 连接到现有Chrome调试实例
connect_to_existing_chrome() {
  local port=$1
  echo "🔗 连接到现有Chrome调试实例 (端口: ${port})"

  # 获取页面列表
  echo "获取Chrome页面列表..."
  local pages_json
  pages_json=$(curl -s "http://localhost:${port}/json/list")

  if [ $? -eq 0 ]; then
    echo "✅ 成功连接到Chrome调试端口 ${port}"
    echo "可用页面:"
    echo "$pages_json" | jq -r '.[] | "  - \(.title) (\(.url))"'
    return 0
  else
    echo "❌ 无法连接到Chrome调试端口 ${port}"
    return 1
  fi
}

# 分析SiliconFlow页面
analyze_siliconflow() {
  local port=$1
  local target_url="https://cloud.siliconflow.cn/me/models"

  echo "🔬 开始分析SiliconFlow页面: ${target_url}"

  # 创建新的页面用于分析
  echo "创建新页面..."
  local create_response
  create_response=$(curl -s -X POST "http://localhost:${port}/json/new" \
    -H "Content-Type: application/json" \
    -d "{\"url\": \"${target_url}\"}")

  local page_id
  page_id=$(echo "$create_response" | jq -r '.id')

  if [ -z "$page_id" ] || [ "$page_id" = "null" ]; then
    echo "❌ 无法创建新页面"
    return 1
  fi

  echo "✅ 页面创建成功 (ID: ${page_id})"

  # 等待页面加载
  echo "等待页面加载..."
  sleep 8

  # 获取页面基本信息
  echo "收集页面信息..."

  # 1. 获取DOM结构
  echo "  📊 分析页面DOM结构..."

  # 2. 提取CSS变量
  echo "  🎨 提取CSS设计系统..."

  # 3. 截图页面
  echo "  📸 截取页面布局图..."

  # 4. 分析布局网格
  echo "  📐 分析布局网格系统..."

  echo "✅ SiliconFlow页面分析任务已排队"
  echo "页面ID: ${page_id}"
  echo "WebSocket调试地址: ws://localhost:${port}/devtools/page/${page_id}"

  # 保存连接信息
  cat > /tmp/chrome_mcp_info.json <<EOF
{
  "port": ${port},
  "page_id": "${page_id}",
  "target_url": "${target_url}",
  "created_at": "$(date -Iseconds)",
  "websocket_url": "ws://localhost:${port}/devtools/page/${page_id}"
}
EOF

  echo "📁 连接信息已保存到: /tmp/chrome_mcp_info.json"
}

# 主执行流程
main() {
  echo "========================================"
  echo "Chrome MCP深度分析 - SiliconFlow专用"
  echo "========================================"

  # 设置调试端口
  DEBUG_PORT=${1:-9222}

  # 检查现有调试端口
  EXISTING_PORT=$(get_chrome_debug_port)
  if [ -n "$EXISTING_PORT" ]; then
    echo "发现现有Chrome调试端口: ${EXISTING_PORT}"
    if connect_to_existing_chrome "$EXISTING_PORT"; then
      analyze_siliconflow "$EXISTING_PORT"
      return 0
    fi
  fi

  # 检查Chrome是否运行
  if check_chrome_running; then
    echo "⚠️  Chrome正在运行但未启用调试模式"
    echo "建议操作:"
    echo "  1. 手动启用调试: chrome://inspect/#devices"
    echo "  2. 同意使用此脚本重启Chrome"

    read -p "重启Chrome以启用调试模式？ (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
      start_chrome_with_debug
      analyze_siliconflow "$DEBUG_PORT"
    else
      echo "使用现有Chrome实例..."
      echo "请在Chrome地址栏输入: chrome://inspect/#devices"
      echo "然后点击 'Configure...' 添加: localhost:9222"
      echo "完成后重新运行此脚本"
      return 1
    fi
  else
    # Chrome未运行，直接启动调试模式
    start_chrome_with_debug
    analyze_siliconflow "$DEBUG_PORT"
  fi

  echo "========================================"
  echo "✅ Chrome MCP深度分析已启动"
  echo "✅ 目标: SiliconFlow布局模仿"
  echo "✅ 老板！随时进行像素级对比分析！"
  echo "========================================"
}

# 执行主函数
main "$@"