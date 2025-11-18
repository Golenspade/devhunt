# Changelog

_版本号规则：pround.normal.shame（对应 major.minor.patch，分别代表「大版本」「普通功能版本」「羞耻补丁」）。_

## 0.0.8

> 当前版本（pround=0, normal=0, shame=8）。

### Added
- **贡献统计数据拉取**：新增 `contributionsCollection` 数据拉取功能，获取用户在最近一年内的完整贡献统计。
- **贡献日历（热力图）数据**：包含按天统计的贡献数据，支持可视化活跃度趋势。
- **多维度贡献统计**：
  - `totalCommitContributions` - 总提交数
  - `totalIssueContributions` - 总 Issue 数
  - `totalPullRequestContributions` - 总 PR 数
  - `totalPullRequestReviewContributions` - 总 PR Review 数
  - `totalRepositoriesWithContributedCommits` - 贡献过 commit 的仓库数
  - `totalRepositoriesWithContributedIssues` - 创建过 issue 的仓库数
  - `totalRepositoriesWithContributedPullRequests` - 创建过 PR 的仓库数
  - `totalRepositoriesWithContributedPullRequestReviews` - 进行过 PR review 的仓库数
  - `totalRepositoryContributions` - 创建的仓库数
  - `restrictedContributionsCount` - 私有仓库贡献数（如果用户启用了私有贡献计数）
- **新增 GraphQL 查询文件**：`src/queries/user_contributions.graphql`，支持自定义时间范围（`from`/`to` 参数）。
- **新增输出文件**：`out/<login>/raw/contributions.json`，存储完整的贡献统计数据（JSON 格式）。

### Changed
- `scanUser()` 函数现在会并行拉取贡献统计数据，与 repos/PRs/profile README 一起获取。
- 贡献统计默认时间范围为最近一年（从当前时间往前推 365 天）。
- 控制台输出现在会显示 "contributions data" 已拉取。

### Technical Details
- 新增 TypeScript 接口：`ContributionsCollectionResult`、`ContributionsCollectionNode`、`ContributionCalendar`、`ContributionCalendarWeek`、`ContributionCalendarDay`。
- 新增辅助函数：`fetchContributionsCollection()`，遵循现有的 `fetchAllRepos()` 等函数的模式。
- 贡献统计不是分页接口，一次查询返回完整数据。
- 已通过真实用户验证（Golenspade, pablo-abc）。


## 0.0.7

### Fixed
- **C# 语言提取 bug**：修复 `/\bC#\b/i` 正则无法匹配的问题（`#` 不是单词字符，`\b` 后边界失效），改用前瞻断言 `/\bC#(?=\s|,|;|\.|$)/i`。
- **C 语言提取冲突**：添加负向前瞻 `/\bC(?![+#])/i` 避免误匹配 C++ / C#。

### Added
- **JavaScript 生态关键词映射**：Node.js / Next.js / Vue / React / Svelte / Angular / Nuxt / Express / Nest 等框架/运行时在 README 中提及时，自动映射到 JavaScript。
- **新增语言支持**：C、Lua 加入 `KNOWN_LANGUAGES` 列表。
- **单元测试**：新增测试用例验证 C# 提取和 JavaScript 生态映射逻辑。

### Changed
- `extractReadmeLanguages()` 现在会将 JavaScript 框架/运行时关键词归一化为 JavaScript，提升语言一致性检查的准确性。


## 0.0.6

### Added
- Profile README 一致性信号层（ConsistencySignals）：比较 README 自述的语言/仓库 与 repos/skills 等行为数据。
- `profile.json` 新增 `consistency` 字段，包含语言交集、支持比例和自有仓库提及情况。
- 纯函数 `computeReadmeConsistency()` 及配套单元测试，覆盖强一致/明显不符/未知等场景。

### Changed
- `analyzeAll()` 现在会自动计算 README vs 行为数据的一致性信号，并写入 `profile.json`，作为第 3 层证据结构的一部分。



## 0.0.5

> 当前版本（pround=0, normal=0, shame=5）。

### Added
- Profile README 分析功能：识别 6 种风格（none / empty / one_liner / short_bio / visual_dashboard / mixed）。
- Profile README 文本提取：去除 Markdown 格式，提取纯文本摘要（前 400 字符）。
- Profile README 图片提取：从 `![alt](url)` 和 `<img alt="..." />` 提取 alt 文本。
- `analyzeProfileReadme()` 函数及配套单元测试，覆盖常见 README 风格。
- `profile.json` 新增 `readme` 字段，包含风格分类和提取的内容。

### Changed
- `scan` 命令现在会尝试拉取用户的 Profile README（`<login>/<login>` 仓库的 `README.md`）。
- `report` 命令现在会读取 `profile_readme.md` 并将其分析结果写入 `profile.json`。
- 为 `src/` 目录下的核心模块（analyze/scan/export/gh/charts/email/errors/timeWindow/cli）添加中文注释，补充设计理念和使用说明。

### Fixed
- 暂无（本次为功能+文档更新）。


## 0.0.4

> 当前版本（pround=0, normal=0, shame=4）。

### Added
- `scan` 命令支持 `--window` 时间窗口参数（quarter/half/year/3y/all，默认 year），用于限制 commit 拉取范围。
- `scan` 新增 `commits.jsonl` 输出，逐条记录用户在自有仓库默认分支上的 commit（含行数/文件数规模、邮箱域名分类、关联 PR 及母仓信息）。
- 新增 `docs/cli-params.md`，集中说明 CLI 参数和开关。

### Changed
- 调整 `scan` 流程，先解析时间窗口，再并行拉取 repos / PR / commits，并在日志中打印仓库/PR/commit 总数。
- 对邮箱解析逻辑进行抽象（`parseEmailInfo`），在 commit 记录中存储邮箱 domain 与 `.edu/.gov/.org` 分类。

### Fixed
- 修复 `scan.ts` 中辅助函数重复定义的问题，避免潜在的构建/类型冲突。
- 为时间窗口解析与邮箱解析补充单元测试，确保行为稳定。


## 0.0.2

> 当前版本（pround=0, normal=0, shame=2）。

### Added
- CLI `scan` / `report` 过程中的显式日志输出，避免“静默跑完看不见”的体验。
- `scan` 结束后明确打印 raw 产物路径：`out/<login>/raw/repos.jsonl`、`out/<login>/raw/prs.jsonl`。
- `report` 结束后明确打印报告产物路径：
  - `out/<login>/profile.json`
  - `out/<login>/top_repos.json`
  - `out/<login>/charts/languages.svg`
  - `out/<login>/charts/hours.svg`
- 引入结构化错误类型 `DevhuntError` 及子类：
  - `GitHubNetworkError`：网络/代理/超时等问题；
  - `GitHubAuthError`：Token 缺失/无效/过期/权限不足；
  - `GitHubNotFoundError`：目标用户不存在或不可访问；
  - `CliError`：本地 `gh` CLI 缺失或异常；
  - `AnalysisError`：分析或生成报告过程中（依赖缺失/代码异常）出错。
- 顶层 CLI 对上述错误进行分类处理，并给出中文提示与可操作建议。

### Changed
- `scan` / `report` 逻辑在保持原有行为的前提下，增加进度提示与错误分层，使“失败方式”更可解释。

### 0.0.1

- 初始 MVP：
  - `scan`：使用 GitHub GraphQL 拉取仓库与 PR 数据，写入 `out/<login>/raw/*.jsonl`；
  - `analyze`：计算语言权重、活跃时间、UOI 等核心画像指标；
  - `export/report`：生成 `profile.json`、`top_repos.json` 以及 `languages.svg` / `hours.svg`。
