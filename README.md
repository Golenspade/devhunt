# DevHunt

<div align="center">

```
██████╗ ███████╗██╗   ██╗██╗  ██╗██╗   ██╗███╗   ██╗████████╗
██╔══██╗██╔════╝██║   ██║██║  ██║██║   ██║████╗  ██║╚══██╔══╝
██║  ██║█████╗  ██║   ██║███████║██║   ██║██╔██╗ ██║   ██║   
██║  ██║██╔══╝  ╚██╗ ██╔╝██╔══██║██║   ██║██║╚██╗██║   ██║   
██████╔╝███████╗ ╚████╔╝ ██║  ██║╚██████╔╝██║ ╚████║   ██║   
╚═════╝ ╚══════╝  ╚═══╝  ╚═╝  ╚═╝ ╚═════╝ ╚═╝  ╚═══╝   ╚═╝   
```

**Developer Intelligence Platform**

GitHub 开发者画像分析工具 —— 基于 Bun + TypeScript + Next.js

[![Version](https://img.shields.io/badge/version-0.1.3-blue.svg)](./package.json)
[![Bun](https://img.shields.io/badge/runtime-Bun-f9f1e1.svg)](https://bun.sh)
[![Next.js](https://img.shields.io/badge/frontend-Next.js%2016-black.svg)](https://nextjs.org)

</div>

---

## ✨ 功能特性

- 🔍 **数据扫描** - 从 GitHub GraphQL API 抓取用户仓库、PR、Commit 等行为数据
- 📊 **画像分析** - 生成多维度开发者画像 JSON 和可视化图表
- 🤖 **AI 导读** - 基于 LLM 生成自然语言的开发者画像解读
- 🎨 **可视化仪表盘** - 现代化的 Web UI 展示分析结果
- ⚡ **一键启动** - 提供自动化脚本，快速部署和运行

---

## 🚀 快速开始

### 环境要求

- [Bun](https://bun.sh) >= 1.0
- [pnpm](https://pnpm.io) >= 8.0
- [GitHub Token](https://github.com/settings/tokens) (用于 API 访问)

### 一键启动

```bash
# 完整启动（安装依赖 + 启动服务 + 打开浏览器）
./start.sh

# 快速启动（跳过依赖安装，适合已安装过的情况）
./dev.sh

# 构建生产版本
./build.sh
```

### 手动启动

```bash
# 1. 安装后端依赖
bun install

# 2. 安装前端依赖
cd profile-json-analysis && pnpm install

# 3. 启动前端开发服务器
pnpm dev
```

访问 http://localhost:3000/launch 开始使用。

---

## 📖 使用指南

### CLI 命令

DevHunt 提供三个核心子命令：

```bash
# 扫描用户数据
bun devhunt scan <login> --token $GITHUB_TOKEN [--window quarter|half|year|3y|all] [--yes]

# 生成画像报告
bun devhunt report <login> [--tz Asia/Shanghai]

# AI 导读（生成自然语言解读）
bun devhunt narrate <login> [--lang zh|en] [--style professional|casual|brief]
```

| 命令 | 说明 | 输出 |
|------|------|------|
| `scan` | 扫描 GitHub 用户，拉取原始数据 | `out/<login>/raw/` |
| `report` | 分析数据生成画像和图表 | `out/<login>/profile.json`, `charts/*.svg` |
| `narrate` | AI 生成画像导读 | 控制台输出 / prompts |

详细参数说明请见 [`docs/cli-params.md`](./docs/cli-params.md)

### Web 界面

启动后访问：

- **Launch 页面**: http://localhost:3000/launch - 输入用户名开始分析
- **Dashboard**: http://localhost:3000 - 查看分析结果可视化

### AI 配置

AI 导读功能支持多种 LLM 提供商：

| 提供商 | Base URL | 模型示例 |
|--------|----------|----------|
| OpenAI | `https://api.openai.com/v1` | `gpt-4o-mini`, `gpt-4o` |
| Claude | `https://api.anthropic.com/v1` | `claude-3-5-sonnet-20241022` |
| DeepSeek | `https://api.deepseek.com/v1` | `deepseek-chat` |
| Qwen | `https://dashscope.aliyuncs.com/compatible-mode/v1` | `qwen-turbo` |
| Ollama | `http://localhost:11434/v1` | `llama3.2` |

在 Dashboard 的 AI Narrative 组件中配置 API Key 和 Base URL 即可使用。

---

## 🏗️ 项目结构

```
devhunt/
├── bin/                    # CLI 入口
│   └── devhunt.ts
├── src/                    # 后端核心逻辑
│   ├── scan.ts             # GitHub 数据扫描
│   ├── analyze.ts          # 数据分析
│   ├── export.ts           # 报告导出
│   ├── agent/              # AI 导读模块
│   │   ├── index.ts        # 核心 API
│   │   └── cli.ts          # CLI 适配
│   ├── analysis/           # 分析算法
│   ├── queries/            # GraphQL 查询
│   └── types/              # TypeScript 类型
├── profile-json-analysis/  # Next.js 前端
│   ├── app/                # App Router
│   │   ├── api/            # API Routes
│   │   │   ├── analyze/    # 分析 API
│   │   │   ├── profile/    # 画像 API
│   │   │   └── narrate/    # AI 导读 API
│   │   ├── launch/         # 启动页面
│   │   └── page.tsx        # Dashboard
│   └── components/         # React 组件
│       ├── ai-narrative.tsx
│       ├── contribution-calendar.tsx
│       └── ...
├── out/                    # 输出目录（扫描和分析结果）
├── start.sh                # 一键启动脚本
├── dev.sh                  # 快速启动脚本
└── build.sh                # 构建脚本
```

---

## 📊 画像指标

DevHunt 分析并计算以下开发者指标：

| 指标 | 说明 |
|------|------|
| **UOI** (Upstream Orientation Index) | 上游贡献倾向 (0=纯创作者, 1=纯协作者) |
| **Grit Factor** | 项目交付率，反映坚持度 |
| **Uni Index** | 协作光谱，个人 vs 团队偏好 |
| **Night Ratio** | 夜间编码比例 |
| **Focus Ratio** | 专注度，主力语言占比 |
| **Skills** | 技能分布（按语言权重） |
| **Tags** | 自动生成的开发者标签 |

---

## 🛠️ 开发

```bash
# 运行测试
bun test

# 类型检查
bun run --bun tsc --noEmit

# 前端 Lint
cd profile-json-analysis && pnpm lint
```

---

## 📝 更新日志

详见 [CHANGELOG.md](./CHANGELOG.md)

---

## 🤝 行为准则

请阅读 [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md) 了解使用本工具的道德准则。

**核心原则：Do No Harm** - 请善用此工具，尊重每一位开发者。

---

## 📄 License

[MIT](./LICENSE) © 2024 Golenspade

