#!/bin/bash

# DevHunt 快速启动脚本（跳过依赖安装）
# 适用于已安装依赖的情况，启动更快

set -e

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
FRONTEND_DIR="$ROOT_DIR/profile-json-analysis"

echo "🚀 DevHunt Quick Start"
echo "════════════════════════════════════════"

cd "$FRONTEND_DIR"

# 启动前端并打开浏览器
echo "启动前端服务..."

# macOS 打开浏览器
if [[ "$OSTYPE" == "darwin"* ]]; then
    (sleep 2 && open "http://localhost:3000/launch") &
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    (sleep 2 && xdg-open "http://localhost:3000/launch" 2>/dev/null) &
fi

echo ""
echo "  前端界面: http://localhost:3000/launch"
echo "  Dashboard: http://localhost:3000"
echo ""
echo "  按 Ctrl+C 停止服务"
echo ""

pnpm dev
