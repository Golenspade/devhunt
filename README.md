# devhunt

**GitHub Developer Profile Tool / GitHub 开发者画像工具**

A comprehensive tool for building developer profiles from GitHub public data, powered by Bun + TypeScript + GitHub GraphQL API.

基于 Bun + TypeScript + GitHub GraphQL API 的开发者画像构建工具。

> **Current Version / 当前版本：0.1.3** (pround.normal.shame)

[English](#english) | [中文](#中文)

---

<a name="english"></a>
## 🇬🇧 English

### Overview

devhunt analyzes GitHub user activity to generate comprehensive developer profiles, including:

- **Language Proficiency** - Weighted analysis of programming languages based on repositories and stars
- **Activity Patterns** - Work hour distribution and core active periods
- **Contribution Metrics** - UOI (Upstream Orientation Index), external PR acceptance rate
- **Behavioral Insights** - Night ratio, focus ratio, grit factor
- **Community Engagement** - Talk vs Code ratio, contribution momentum
- **Visual Dashboard** - Interactive web interface for profile visualization

### Quick Start

```bash
# Install dependencies
bun install

# Set your GitHub token
export GITHUB_TOKEN=ghp_xxx

# Scan a GitHub user (fetches raw data)
bun devhunt scan <username> --window year

# Generate profile report
bun devhunt report <username> --tz Asia/Shanghai
```

### CLI Commands

#### `scan` - Fetch Raw Data

```bash
bun devhunt scan <login> --token $GITHUB_TOKEN [--window quarter|half|year|3y|all] [--yes|-y]
```

| Option | Description | Default |
|--------|-------------|---------|
| `--token <token>` | GitHub Personal Access Token | `$GITHUB_TOKEN` or `$GH_TOKEN` |
| `--window <window>` | Commit time window: `quarter`, `half`, `year`, `3y`, `all` | `year` |
| `--yes`, `-y` | Skip user confirmation prompt | `false` |

**Output files:**
- `out/<login>/raw/repos.jsonl` - Repository data
- `out/<login>/raw/prs.jsonl` - Pull request data
- `out/<login>/raw/commits.jsonl` - Commit history
- `out/<login>/raw/contributions.json` - Contribution statistics
- `out/<login>/raw/user_info.json` - User profile information
- `out/<login>/raw/profile_readme.md` - Profile README (if exists)

#### `report` - Generate Profile

```bash
bun devhunt report <login> [--tz Asia/Shanghai]
```

| Option | Description | Default |
|--------|-------------|---------|
| `--tz <timezone>` | IANA timezone for local time analysis | Auto-detected |

**Output files:**
- `out/<login>/profile.json` - Complete developer profile
- `out/<login>/top_repos.json` - Top repositories with scores
- `out/<login>/charts/languages.svg` - Language distribution chart
- `out/<login>/charts/hours.svg` - Activity hours chart

### Profile Metrics

The generated `profile.json` includes:

| Metric | Description |
|--------|-------------|
| `skills` | Language proficiency with weighted scores |
| `core_hours` | Peak activity time periods |
| `uoi` | Upstream Orientation Index (0-1, higher = more upstream contributions) |
| `external_pr_accept_rate` | Merge rate for external PRs |
| `uni_index` | Creator vs Collaborator spectrum |
| `night_ratio` | Proportion of commits during night hours |
| `focus_ratio` | Concentration on primary language |
| `grit_factor` | Long-term project maintenance rate |
| `fork_destiny` | Fork behavior analysis (contributor/variant/noise) |
| `community_engagement` | Talk vs Code ratio |
| `contribution_momentum` | Recent activity acceleration |
| `tags` | Auto-generated archetype labels |

### Web Dashboard

devhunt includes a Next.js-based visual dashboard:

```bash
cd profile-json-analysis
pnpm install
pnpm dev
```

The dashboard displays:
- User profile header with avatar
- Contribution momentum indicators
- Top repositories with evidence
- Language and activity charts
- Real-time scan progress via SSE

### Documentation

- [`docs/cli-params.md`](./docs/cli-params.md) - Detailed CLI parameter reference
- [`docs/user-confirmation.md`](./docs/user-confirmation.md) - User confirmation feature
- [`CHANGELOG.md`](./CHANGELOG.md) - Version history

---

<a name="中文"></a>
## 🇨🇳 中文

### 概览

devhunt 通过分析 GitHub 用户活动，生成全面的开发者画像，包括：

- **语言画像** - 基于仓库和 star 数的编程语言权重分析
- **活跃模式** - 工作时段分布和核心活跃时段
- **贡献指标** - UOI（上游倾向指数）、外部 PR 合并率
- **行为洞察** - 熬夜率、专注率、坚毅指数
- **社区参与** - Talk vs Code 比例、贡献动量
- **可视化面板** - 交互式 Web 界面展示画像数据

### 快速开始

```bash
# 安装依赖
bun install

# 设置 GitHub Token
export GITHUB_TOKEN=ghp_xxx

# 扫描 GitHub 用户（拉取原始数据）
bun devhunt scan <用户名> --window year

# 生成画像报告
bun devhunt report <用户名> --tz Asia/Shanghai
```

### CLI 命令

#### `scan` - 拉取原始数据

```bash
bun devhunt scan <login> --token $GITHUB_TOKEN [--window quarter|half|year|3y|all] [--yes|-y]
```

| 参数 | 说明 | 默认值 |
|------|------|--------|
| `--token <token>` | GitHub Personal Access Token | `$GITHUB_TOKEN` 或 `$GH_TOKEN` |
| `--window <window>` | Commit 时间窗口：`quarter`（季度）、`half`（半年）、`year`（一年）、`3y`（三年）、`all`（全部） | `year` |
| `--yes`, `-y` | 跳过用户确认提示 | `false` |

**输出文件：**
- `out/<login>/raw/repos.jsonl` - 仓库数据
- `out/<login>/raw/prs.jsonl` - Pull Request 数据
- `out/<login>/raw/commits.jsonl` - Commit 历史
- `out/<login>/raw/contributions.json` - 贡献统计
- `out/<login>/raw/user_info.json` - 用户基本信息
- `out/<login>/raw/profile_readme.md` - Profile README（如果存在）

#### `report` - 生成画像报告

```bash
bun devhunt report <login> [--tz Asia/Shanghai]
```

| 参数 | 说明 | 默认值 |
|------|------|--------|
| `--tz <timezone>` | IANA 时区名称，用于本地化时间分析 | 自动检测 |

**输出文件：**
- `out/<login>/profile.json` - 完整的开发者画像
- `out/<login>/top_repos.json` - Top 仓库及评分
- `out/<login>/charts/languages.svg` - 语言分布图
- `out/<login>/charts/hours.svg` - 活跃时段图

### 画像指标说明

生成的 `profile.json` 包含以下指标：

| 指标 | 说明 |
|------|------|
| `skills` | 语言技能权重 |
| `core_hours` | 核心活跃时段 |
| `uoi` | 上游倾向指数（0-1，越高表示越倾向于贡献外部项目） |
| `external_pr_accept_rate` | 外部 PR 合并率 |
| `uni_index` | 创作者 vs 协作者光谱 |
| `night_ratio` | 熬夜率（夜间 commit 占比） |
| `focus_ratio` | 专注率（主语言占比） |
| `grit_factor` | 坚毅指数（长期维护项目比例） |
| `fork_destiny` | Fork 宿命分析（贡献者/变体/噪音） |
| `community_engagement` | 社区参与度（Talk vs Code 比例） |
| `contribution_momentum` | 贡献动量（最近活跃加速度） |
| `tags` | 自动生成的原型标签 |

### Web 可视化面板

devhunt 包含一个基于 Next.js 的可视化面板：

```bash
cd profile-json-analysis
pnpm install
pnpm dev
```

面板展示内容：
- 用户信息头部（含头像）
- 贡献动量指示器
- Top 仓库及证据
- 语言和活跃时段图表
- 通过 SSE 实时显示扫描进度

### 文档

- [`docs/cli-params.md`](./docs/cli-params.md) - 详细的 CLI 参数说明
- [`docs/user-confirmation.md`](./docs/user-confirmation.md) - 用户确认功能说明
- [`CHANGELOG.md`](./CHANGELOG.md) - 版本历史

---

## Project Status / 项目状态

**v0.1.3** - Current stable release with full feature set:

- ✅ GitHub data scanning (repos, PRs, commits, contributions)
- ✅ Profile README analysis and consistency checking
- ✅ Multi-dimensional behavior metrics
- ✅ SVG chart generation (Vega-Lite)
- ✅ Web dashboard with real-time scanning
- ✅ User avatar support
- ✅ Archetype tag system

**v0.1.3** - 当前稳定版本，功能完整：

- ✅ GitHub 数据扫描（仓库、PR、Commit、贡献统计）
- ✅ Profile README 分析与一致性检查
- ✅ 多维度行为指标
- ✅ SVG 图表生成（Vega-Lite）
- ✅ Web 可视化面板（支持实时扫描）
- ✅ 用户头像支持
- ✅ 原型标签系统

---

## Development / 开发

```bash
# Run tests / 运行测试
bun test

# Run CLI directly / 直接运行 CLI
bun devhunt scan <username>
bun devhunt report <username>

# Start dashboard dev server / 启动面板开发服务器
cd profile-json-analysis && pnpm dev
```

## License / 许可证

MIT
