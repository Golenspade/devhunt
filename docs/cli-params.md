# devhunt CLI Parameter Reference / CLI 参数说明

This document explains the command-line parameters and options for the `devhunt` CLI tool.

本文档说明 `devhunt` 命令行工具的参数和开关。

[English](#english) | [中文](#中文)

---

<a name="english"></a>
## 🇬🇧 English

### 1. Overview

Entry point:

```bash
bun devhunt <command> [...args]
```

Currently supported commands:

- `scan` — Scan a GitHub user, fetch raw data (repos / PRs / commits)
- `report` — Generate profile report and charts from raw data

All output is written to `out/<login>/` directory by default.

---

### 2. `scan` Command

**Usage:**

```bash
bun devhunt scan <login> --token $GITHUB_TOKEN [--window quarter|half|year|3y|all] [--yes|-y]
```

#### 2.1 Positional Arguments

- `<login>`
  - **Required**
  - GitHub username to scan, e.g., `torvalds`, `Golenspade`
  - Results are written to: `out/<login>/raw/`

#### 2.2 Options

##### 2.2.1 `--token <token>`

- **Required:** Strongly recommended; if not provided, `devhunt` will try environment variables.
- **Purpose:** GitHub Personal Access Token for GraphQL API calls.
- **Priority:**
  1. CLI argument `--token <token>`
  2. Environment variable `GITHUB_TOKEN`
  3. Environment variable `GH_TOKEN`
- **Recommendation:** Use a Fine-grained Personal Access Token with public repository access.

If none are configured, `scan` will fail with an authentication error.

##### 2.2.2 `--window <window>`

- **Required:** No, defaults to `year`.
- **Purpose:** Controls the commit time window for `commits.jsonl`.
- **Options:**
  - `quarter` — Last 1 quarter (~90 days)
  - `half` — Last half year (~182 days)
  - `year` — Last 1 year (365 days)
  - `3y` — Last 3 years
  - `all` — No time limit, fetch full commit history on default branch
- **Default behavior:**
  - If not specified, equivalent to `--window year`
  - Internally calculates a `since` timestamp, only fetching commits where `authoredDate >= since`
  - When `all` is selected, no `since` parameter is passed (full history)

Terminal output examples:
- `[devhunt] Commit time window: since 2023-01-01T00:00:00.000Z`
- `[devhunt] Commit time window: full history`

##### 2.2.3 `--yes` / `-y`

- **Required:** No.
- **Purpose:** Skip the user confirmation prompt before scanning. Useful for batch scanning or CI.
- **Default behavior:**
  - Without `--yes` / `-y`, in interactive terminals (`process.stdin.isTTY === true`), displays user info preview and waits for input.
  - In non-interactive terminals (e.g., CI), confirmation is automatically skipped.
- **Recommendation:** Use `--yes` (or `-y`) in scripts or automation to avoid blocking.

#### 2.3 `scan` Output Files

After successful `scan`, the following files are generated:

- `out/<login>/raw/repos.jsonl`
  - User's owned repository list (GitHub `user.repositories` raw data)
  - Includes: name, isFork, isArchived, primaryLanguage, stars, forks, description, repositoryTopics, languages

- `out/<login>/raw/prs.jsonl`
  - User's pull request list (GitHub `user.pullRequests` raw data)
  - Includes: createdAt, mergedAt, closedAt, isCrossRepository, additions, deletions, changedFiles, repository info, url

- `out/<login>/raw/commits.jsonl`
  - User's commits on default branch:
    - Filtered by `--window` time range
    - Includes: time, message, lines/files stats, author email domain classification, associated PRs and parent repo info

- `out/<login>/raw/contributions.json`
  - Contribution statistics from GitHub ContributionsCollection
  - Includes: commit/issue/PR/review counts, contribution calendar (heatmap data)

- `out/<login>/raw/user_info.json`
  - User profile information (high-trust fields)
  - Includes: bio, company, location, websiteUrl, twitterUsername, avatarUrl, followers, following, organizations

- `out/<login>/raw/profile_readme.md`
  - User's Profile README (if exists)

---

### 3. `report` Command

**Usage:**

```bash
bun devhunt report <login> [--tz Asia/Shanghai]
```

#### 3.1 Positional Arguments

- `<login>`
  - **Required**
  - GitHub username to generate report for
  - Requires prior execution of `bun devhunt scan <login> ...` to have data in `out/<login>/raw/`

#### 3.2 Options

##### 3.2.1 `--tz <IANA timezone name>`

- **Required:** No.
- **Purpose:** Used for localized time analysis (e.g., activity hour distribution).
- **Examples:**
  - `--tz Asia/Shanghai`
  - `--tz Europe/Berlin`
  - `--tz America/Los_Angeles`
- **Default behavior:**
  - If not specified, uses analysis module's default/inference logic
  - Report can still be generated, but "local time" meaning may be weaker

#### 3.3 `report` Output Files

After successful `report`, the following files are generated in `out/<login>/`:

- `profile.json` — Core developer profile JSON data
- `top_repos.json` — Top repositories with scores and evidence
- `charts/`
  - `languages.svg` — Language distribution chart
  - `hours.svg` — Activity hour distribution chart

---

### 4. Error Handling

`devhunt` categorizes common errors with helpful messages:

| Error Type | Description |
|------------|-------------|
| `network` | Cannot access GitHub API |
| `auth` | Token not configured/expired/insufficient permissions |
| `not_found` | Target user doesn't exist or is inaccessible |
| `analysis` | Local dependency issue or analysis code bug |
| `cli` | Local GitHub CLI (`gh`) unavailable |

Detailed error information is printed to terminal for debugging.

---

<a name="中文"></a>
## 🇨🇳 中文

### 1. 总体说明

命令入口：

```bash
bun devhunt <command> [...args]
```

当前支持两个子命令：

- `scan` — 扫描指定 GitHub 用户，拉取原始数据（repos / PRs / commits）
- `report` — 基于已有原始数据生成画像报告和图表

所有输出默认写到项目根目录下的 `out/<login>/` 目录。

---

### 2. `scan` 子命令

**用法：**

```bash
bun devhunt scan <login> --token $GITHUB_TOKEN [--window quarter|half|year|3y|all] [--yes|-y]
```

#### 2.1 位置参数

- `<login>`
  - **必选**
  - 要扫描的 GitHub 用户名（login），例如：`torvalds`、`Golenspade`
  - 扫描结果会写入：`out/<login>/raw/`

#### 2.2 选项参数

##### 2.2.1 `--token <token>`

- **是否必选：** 对扫描来说是强推荐；如果不传，`devhunt` 会尝试使用环境变量。
- **作用：** 用于调用 GitHub GraphQL API 的访问令牌。
- **优先级：**
  1. 命令行参数 `--token <token>`
  2. 环境变量 `GITHUB_TOKEN`
  3. 环境变量 `GH_TOKEN`
- **建议：** 使用 Fine-grained Personal Access Token，只需要访问公开仓库的权限即可。

若三者都未配置，`scan` 会因认证错误失败，并给出中文错误提示。

##### 2.2.2 `--window <window>`

- **是否必选：** 否，默认值为 `year`。
- **作用：** 控制「commit 拉取的时间窗口」，用于限制 `commits.jsonl` 中包含的 commit 范围。
- **可选取值：**
  - `quarter` — 最近 1 个季度（约 90 天）
  - `half` — 最近半年（约 182 天）
  - `year` — 最近 1 年（365 天）
  - `3y` — 最近 3 年
  - `all` — 不限制时间，拉取默认分支上该用户的全部 commit 历史
- **默认行为：**
  - 如果不指定 `--window`，等价于 `--window year`
  - 内部会计算一个 `since` 时间戳，只拉取 `authoredDate >= since` 的 commit
  - 选择 `all` 时，不传 `since` 参数，相当于"全量历史"

执行时，终端会打印当前使用的时间窗口，例如：
- `[devhunt] Commit time window: since 2023-01-01T00:00:00.000Z`
- `[devhunt] Commit time window: full history`

##### 2.2.3 `--yes` / `-y`

- **是否必选：** 否。
- **作用：** 跳过扫描前的"用户信息预览 + 是否继续 (y/n)"确认步骤，适用于批量扫描或 CI 环境。
- **默认行为：**
  - 若不指定 `--yes` / `-y`，并且当前是交互式终端（`process.stdin.isTTY === true`），则会显示用户信息预览并等待输入。
  - 在非交互式终端（如 CI）中，即使不传 `--yes`，也会自动跳过确认，不阻塞流程。
- **建议：** 在脚本或自动化场景中，统一使用 `--yes`（或 `-y`）以避免进程卡在等待人工输入。

#### 2.3 `scan` 的输出文件

`scan` 成功后，会在项目根目录下生成以下文件：

- `out/<login>/raw/repos.jsonl`
  - 该用户的自有仓库列表（GitHub `user.repositories` 的原始数据）
  - 包含：name、isFork、isArchived、primaryLanguage、stars、forks、description、repositoryTopics、languages

- `out/<login>/raw/prs.jsonl`
  - 该用户发起的拉取请求列表（GitHub `user.pullRequests` 的原始数据）
  - 包含：createdAt、mergedAt、closedAt、isCrossRepository、additions、deletions、changedFiles、repository 信息、url

- `out/<login>/raw/commits.jsonl`
  - 该用户作为 author 的 commit 列表：
    - 只包含默认分支上的 commit
    - 根据 `--window` 对时间进行截断
    - 每条记录包含：时间、message、行数/文件数规模、作者邮箱及域名分类、关联 PR 和母仓信息等

- `out/<login>/raw/contributions.json`
  - 来自 GitHub ContributionsCollection 的贡献统计
  - 包含：commit/issue/PR/review 计数、贡献日历（热力图数据）

- `out/<login>/raw/user_info.json`
  - 用户基本信息（高可信度字段）
  - 包含：bio、company、location、websiteUrl、twitterUsername、avatarUrl、followers、following、organizations

- `out/<login>/raw/profile_readme.md`
  - 用户的 Profile README（如果存在）

---

### 3. `report` 子命令

**用法：**

```bash
bun devhunt report <login> [--tz Asia/Shanghai]
```

#### 3.1 位置参数

- `<login>`
  - **必选**
  - 要生成报告的 GitHub 用户名
  - 需要在此之前已经执行过 `bun devhunt scan <login> ...`，保证 `out/<login>/raw/` 下有数据

#### 3.2 选项参数

##### 3.2.1 `--tz <IANA 时区名>`

- **是否必选：** 否。
- **作用：** 用于画像中涉及「本地化时间」的分析维度（如活跃时段分布）。
- **例子：**
  - `--tz Asia/Shanghai`
  - `--tz Europe/Berlin`
  - `--tz America/Los_Angeles`
- **默认行为：**
  - 若不指定，则使用分析模块内置的默认/推断逻辑
  - 报告仍可生成，只是「本地时间」含义会稍弱一些

#### 3.3 `report` 的输出文件

`report` 成功后，会在 `out/<login>/` 下生成：

- `profile.json` — 开发者画像的核心 JSON 数据
- `top_repos.json` — Top 仓库及其得分与证据
- `charts/`
  - `languages.svg` — 语言分布图
  - `hours.svg` — 活跃时段分布图

---

### 4. 错误处理

`devhunt` 对常见错误做了分类和中文提示，方便排查：

| 错误类型 | 说明 |
|----------|------|
| `network` | 无法访问 GitHub API |
| `auth` | Token 未配置/过期/权限不够 |
| `not_found` | login 不存在或不可访问 |
| `analysis` | 本地依赖问题或分析代码 bug |
| `cli` | 本地 GitHub CLI (`gh`) 不可用 |

详细错误信息会打印在终端中，可用于进一步定位问题。
