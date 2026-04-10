#!/bin/bash
# Tick Gold 项目定期清理脚本
echo "=== Tick Gold 项目清理脚本 ==="

# 1. 清理Rust构建缓存
echo "清理Rust target..."
rm -rf src/src-tauri/target/debug/ 2>/dev/null
echo "✓ Rust缓存清理完成"

# 2. 清理Python虚拟环境
echo "清理Python venv..."
find . -name "venv" -type d -prune -exec rm -rf {} \; 2>/dev/null
echo "✓ Python虚拟环境清理完成"

# 3. 清理node_modules（除ecc-plugin外）
echo "清理node_modules..."
find . -name "node_modules" -type d -not -path "./ecc-plugin/node_modules" -prune -exec rm -rf {} \; 2>/dev/null
echo "✓ node_modules清理完成"

# 4. 磁盘空间报告
echo "---"
echo "清理完成！当前磁盘使用:"
du -sh .
echo "建议每月运行一次此脚本"
