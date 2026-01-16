#!/bin/bash

# DevHunt 构建脚本
# 构建前端生产版本

set -e

# 颜色定义
GREEN='\033[0;32m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
FRONTEND_DIR="$ROOT_DIR/profile-json-analysis"

echo -e "${CYAN}DevHunt Build Script${NC}"
echo -e "════════════════════════════════════════"

echo -e "\n${BLUE}[1/3]${NC} 安装后端依赖..."
cd "$ROOT_DIR"
bun install
echo -e "  ${GREEN}✓${NC} 完成"

echo -e "\n${BLUE}[2/3]${NC} 安装前端依赖..."
cd "$FRONTEND_DIR"
pnpm install
echo -e "  ${GREEN}✓${NC} 完成"

echo -e "\n${BLUE}[3/3]${NC} 构建前端生产版本..."
pnpm build
echo -e "  ${GREEN}✓${NC} 完成"

echo -e "\n${GREEN}════════════════════════════════════════${NC}"
echo -e "${GREEN}构建成功！${NC}"
echo -e ""
echo -e "启动生产服务器:"
echo -e "  cd profile-json-analysis && pnpm start"
echo -e ""
