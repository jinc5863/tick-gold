#!/bin/bash
# Context Budget Manager for Claude Code

echo "============================================"
echo "    Context Budget Manager"
echo "============================================"
echo ""

# 检查当前上下文使用情况
echo "📊 当前会话信息："
SESSION_DIR="$HOME/.claude/projects/-Users-office01-work-tick-gold"
if [ -d "$SESSION_DIR" ]; then
    LATEST=$(ls -t "$SESSION_DIR"/*.jsonl 2>/dev/null | head -1)
    if [ -n "$LATEST" ]; then
        SIZE=$(du -h "$LATEST" | cut -f1)
        SIZE_MB=$(du "$LATEST" | cut -f1)
        EST_TOKEN=$((SIZE_MB * 250))
        echo "  当前文件: $(basename $LATEST)"
        echo "  文件大小: $SIZE"
        echo "  预估 Token: ~$EST_TOKEN"
    fi
fi

echo ""
echo "============================================"
echo "📋 可用命令："
echo "============================================"
echo ""
echo "  1. /context-budget  - 分析并优化上下文使用"
echo "  2. /sessions        - 查看所有会话"
echo "  3. /save-session    - 保存当前会话"
echo "  4. /resume-session - 恢复之前的会话"
echo ""
echo "============================================"
echo "💡 快速解决高上下文："
echo "============================================"
echo ""
echo "  1. 开启新的 Claude Code 窗口 (推荐)"
echo "  2. 完全退出 Claude Code (Cmd+Q) 后重启"
echo "  3. 关闭不需要的标签页"
echo ""
echo "============================================"
echo ""

# 清理旧的会话文件（可选）
read -p "是否清理旧的会话文件来释放空间？(y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🗑️  清理旧会话文件..."
    find "$SESSION_DIR" -name "*.jsonl" -not -name "$(basename $LATEST)" -type f -delete 2>/dev/null
    echo "✅ 清理完成！"
fi