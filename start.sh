#!/bin/bash

# DevHunt 一键启动脚本
# 自动安装依赖、启动前后端服务、打开浏览器

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# 项目根目录
ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
FRONTEND_DIR="$ROOT_DIR/profile-json-analysis"

# 全局变量
FRONTEND_PID=""

echo -e "${CYAN}"
echo "╔══════════════════════════════════════════════════════════════════════════╗"
echo "║                                                                          ║"
echo "║  ██████╗ ███████╗██╗   ██╗██╗  ██╗██╗   ██╗███╗   ██╗████████╗          ║"
echo "║  ██╔══██╗██╔════╝██║   ██║██║  ██║██║   ██║████╗  ██║╚══██╔══╝          ║"
echo "║  ██║  ██║█████╗  ██║   ██║███████║██║   ██║██╔██╗ ██║   ██║             ║"
echo "║  ██║  ██║██╔══╝  ╚██╗ ██╔╝██╔══██║██║   ██║██║╚██╗██║   ██║             ║"
echo "║  ██████╔╝███████╗ ╚████╔╝ ██║  ██║╚██████╔╝██║ ╚████║   ██║             ║"
echo "║  ╚═════╝ ╚══════╝  ╚═══╝  ╚═╝  ╚═╝ ╚═════╝ ╚═╝  ╚═══╝   ╚═╝             ║"
echo "║                                                                          ║"
echo "║                  Developer Intelligence Platform                         ║"
echo "║                                                                          ║"
echo "╚══════════════════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# 检查必要的工具
check_requirements() {
    echo -e "${BLUE}[1/5]${NC} 检查环境依赖..."
    
    if ! command -v bun &> /dev/null; then
        echo -e "${RED}✗ 未找到 bun，请先安装: curl -fsSL https://bun.sh/install | bash${NC}"
        exit 1
    fi
    echo -e "  ${GREEN}✓${NC} bun $(bun --version)"
    
    if ! command -v pnpm &> /dev/null; then
        echo -e "${YELLOW}⚠ 未找到 pnpm，正在安装...${NC}"
        npm install -g pnpm
    fi
    echo -e "  ${GREEN}✓${NC} pnpm $(pnpm --version)"
}

# 安装依赖
install_deps() {
    echo -e "\n${BLUE}[2/5]${NC} 安装后端依赖..."
    cd "$ROOT_DIR"
    bun install
    echo -e "  ${GREEN}✓${NC} 后端依赖安装完成"
    
    echo -e "\n${BLUE}[3/5]${NC} 安装前端依赖..."
    cd "$FRONTEND_DIR"
    pnpm install
    echo -e "  ${GREEN}✓${NC} 前端依赖安装完成"
}

# 打开浏览器
open_browser() {
    local url=$1
    sleep 2  # 等待服务启动
    
    if [[ "$OSTYPE" == "darwin"* ]]; then
        open "$url"
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        xdg-open "$url" 2>/dev/null || sensible-browser "$url" 2>/dev/null
    elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "cygwin" ]]; then
        start "$url"
    fi
}

# 启动服务
start_services() {
    echo -e "\n${BLUE}[4/5]${NC} 启动前端开发服务器..."
    cd "$FRONTEND_DIR"
    
    # 在后台启动前端
    pnpm dev &
    FRONTEND_PID=$!
    
    echo -e "  ${GREEN}✓${NC} 前端服务启动中 (PID: $FRONTEND_PID)"
    
    echo -e "\n${BLUE}[5/5]${NC} 打开浏览器..."
    open_browser "http://localhost:3000/launch"
    
    echo -e "\n${GREEN}════════════════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}  DevHunt 启动成功！${NC}"
    echo -e "${GREEN}════════════════════════════════════════════════════════════${NC}"
    echo -e ""
    echo -e "  ${CYAN}前端界面:${NC}  http://localhost:3000/launch"
    echo -e "  ${CYAN}Dashboard:${NC} http://localhost:3000"
    echo -e ""
    echo -e "  ${YELLOW}CLI 命令:${NC}"
    echo -e "    bun devhunt scan <username>   # 扫描 GitHub 用户"
    echo -e "    bun devhunt report <username> # 生成画像报告"
    echo -e "    bun devhunt narrate <username> # AI 导读"
    echo -e ""
    echo -e "  ${RED}按 Ctrl+C 停止所有服务${NC}"
    echo -e ""
    
    # 等待前端进程
    wait $FRONTEND_PID
}

# 清理函数
cleanup() {
    echo -e "\n${YELLOW}正在停止服务...${NC}"
    kill $FRONTEND_PID 2>/dev/null || true
    echo -e "${GREEN}服务已停止${NC}"
    exit 0
}

# 捕获退出信号
trap cleanup SIGINT SIGTERM

# 主流程
main() {
    check_requirements
    install_deps
    start_services
}

main
