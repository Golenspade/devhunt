# Changelog

_版本号规则：pround.normal.shame（对应 major.minor.patch，分别代表「大版本」「普通功能版本」「羞耻补丁」）。_

## 0.1.1

> 当前版本（pround=0, normal=1, shame=1）。

### Fixed
- **前端 UI 优化**：
  - 修复 DevNav 导航按钮 z-index 冲突导致无法点击的问题（将 z-index 从 `z-50` 提升到 `z-[100]`）。
  - 调整 Dashboard 页面 logo 容器尺寸（从 `w-10 h-10` 改为 `w-16 h-10`），防止 logo 变形。
  - 调整 Processing 页面 logo 尺寸（从 `w-24 h-24` 改为 `w-32 h-16`），使其宽度约为下方文字宽度的三分之二，视觉更协调。

### Changed
- **开发体验改进**：
  - Processing 页面自动跳转功能已注释（便于开发调试），可通过取消注释恢复自动跳转到 Dashboard 的行为。

### Tests
- 使用 Playwright 浏览器自动化工具验证：
  - DevNav 三个导航按钮（Dashboard、Launch、Processing）均可正常点击。
  - Logo 在不同页面显示正常，无变形。
  - Processing 页面动画和日志输出正常。


## 0.1.0

> 当前版本（pround=0, normal=1, shame=0）。

### Added
- 新增前端 Dashboard 子项目 `profile-json-analysis/`：
  - 使用 Next.js 16 + React 19 + shadcn/ui 构建 DevHunt Profile 可视化界面。
  - 当前以内置 mock 数据为主，用于快速预览画像设计与布局。

### Changed
- 根项目版本号从 `0.0.14` 提升到 `0.1.0`，标记为「前端可视化」阶段的第一个版本。
- CLI 使用方式保持不变：
  - 仍通过 `bun devhunt scan <login>` / `bun devhunt report <login>` 生成 `out/<login>/profile.json` 等文件。
- 后续计划将 `profile-json-analysis` Dashboard 对接真实 `profile.json` / `top_repos.json`，支持以 GitHub 用户名为入口动态展示画像。

### Tests
- 使用 `pnpm dev` 在本地启动 `profile-json-analysis`，人工验证页面布局、交互与样式正常渲染。
- 核心 CLI 分析逻辑未改动，建议在变更后定期运行 `bun test` / `bun devhunt report <login>` 做回归验证。


## 0.0.14

> 当前版本（pround=0, normal=0, shame=14）。

### Added
- **Contribution Momentum（contribution_momentum）指标**：基于 `contributions.json` 的贡献日历（contributionCalendar），对比最近约一季（最近 12 周）与过去一整年的平均节奏，给出“贡献动量/加速度”评分，用于回答「廉颇老矣，尚能饭否」。

### Changed
- `ProfileJSON` 新增 `contribution_momentum` 字段，包含动量 value、最近一季总贡献 `recent_quarter_total`、过去一年总贡献 `year_total` 以及状态分档（accelerating / steady / cooling_down / ghost / unknown）。
- `analyzeAll()` 现在会在计算 Community Engagement 的同时计算 Contribution Momentum，并将其写入 `profile.json.contribution_momentum`。

### Tests
- 在 `src/analyze.test.ts` 中新增 Contribution Momentum 的单元测试和接线测试，覆盖无数据、基准平稳和明显加速等场景。
- 使用 `bun devhunt report Golenspade / karpathy / A-kirami` 检查 `profile.json` 中的 `contribution_momentum` 数值和 status 是否符合直觉（如 Golenspade 为 accelerating，A-kirami 为 cooling_down）。


## 0.0.13

> 当前版本（pround=0, normal=0, shame=13）。

### Added
- **Fork Destiny（fork_destiny）指标**：基于自有 fork 的 PR 归宿和 star，将 fork 划分为 contributor / variant / noise 三类，用于刻画「fork 之后是归顺、变体，还是噪音」。
- **Community Engagement（community_engagement）指标**：使用 `contributions.json` 中的 issue / review / commit / PR / repo 事件，计算 Talk vs Code 比例和样本量，量化「说」与「做」的平衡。
- **标签系统（tags）**：基于 Fork Destiny + Community Engagement 推导 archetype 标签（如 `hard_forker`、`variant_leader`、`fork_cleaner`、`silent_maker` 等），直接写入 `profile.json.tags`。
- **Grit Factor v2（grit_factor）指标**：按原创自有仓库的生命周期与 star，将仓库划分为 Long Term / Gem / Churn，并计算有效交付率 value = (Long Term + Gem) / 原创自有仓库总数。

### Changed
- `ProfileJSON` 新增字段：
  - `fork_destiny`：自有 fork 宿命分布摘要（total_forks / contributor_forks / variant_forks / noise_forks / stars）。
  - `community_engagement`：Talk vs Code 事件计数、比例与样本量。
  - `tags`：基于上述指标推导出的机器可读标签数组。
  - `grit_factor`：原创自有仓库的长期/小而美/噪音分布及有效交付率。
- `analyzeAll()` 现在会读取 `contributions.json`，计算社区卷入度和标签，并将 Fork Destiny / Community Engagement / Grit Factor / tags 写入 `profile.json` 顶层。

### Tests
- 在 `src/analyze.test.ts` 中为新指标补充单元测试，覆盖：
  - Fork Destiny 三类 fork 的分类逻辑（contributor / variant / noise）。
  - Community Engagement 的 Talk / Code 计数和比例计算。
  - 标签系统和 Grit Factor 的边界与典型场景（无样本 / 多样本混合）。
- 使用真实用户数据进行端到端验证：
  - 通过 `bun devhunt report Golenspade / karpathy / yyx990803 / A-kirami` 检查 `profile.json` 中的 `fork_destiny`、`community_engagement`、`tags` 和 `grit_factor` 是否符合对这些账号的直觉印象。


## 0.0.11

> 当前版本（pround=0, normal=0, shame=11）。

### Changed
- 将原有 `src/analyze.ts` 中的大部分实现拆分为模块化分析层：
  - 新增 `src/analysis/metrics.ts`：集中所有数值/统计类指标（语言权重、UOI、活跃小时直方图、top repos 等）。
  - 新增 `src/analysis/nlp.ts`：集中 Profile README 解析与一致性计算逻辑。
  - 新增 `src/analysis/index.ts`：作为 `analyzeAll()` 的 orchestrator，串联上述指标并构造 `ProfileJSON`。
- 将分析相关的 TypeScript 类型集中到 `src/types/*`：
  - `RepoRecord` / `PRRecord` / `UserInfo` 等 GitHub 相关类型迁移到 `src/types/github.ts`。
  - 画像输出和配置类型（`ProfileJSON` / `AnalyzeOptions` / `AnalysisResult` 等）迁移到 `src/types/profile.ts`。
- `src/analyze.ts` 现在只作为对外门面：
  - 从 `src/types/*` re-export 所有公共类型；
  - 将导出的函数全部转发到 `src/analysis/*`，不再包含重复实现或未使用的 helper。

### Technical Details
- 所有公共 API 保持不变：
  - `import { analyzeAll, computeLanguageWeights, ... } from "./analyze"` 仍然有效；
  - `export.ts` / `cli.ts` / 测试用例无需修改即可兼容新结构。
- 删除了 `src/analyze.ts` 中的冗余实现和未使用的辅助函数，避免相同逻辑在多个文件中重复存在。
- 新增结构说明文档：
  - 在 `structrue_design.md` 中补充「当前仓库实现与模块扩展约定」，明确 `src/types/*` / `src/analysis/*` / `src/analyze.ts` / `src/scan.ts` / `src/export.ts` 各自的职责和扩展方式。
- 全量 `bun test` 通过（31/31），验证这次重构在行为上与 0.0.10 完全兼容。

## 0.0.10

> 当前版本（pround=0, normal=0, shame=10）。

### Added
- **用户基本信息拉取**：新增 `bio`、`company`、`location`、`websiteUrl`、`twitterUsername`、`followers`、`following`、`organizations` 字段到 `profile.json`。
  - **数据来源**：GitHub GraphQL API User 对象（高可信度字段）
  - **存储位置**：`out/<login>/raw/user_info.json`（单个 JSON 对象）
  - **用途**：
    - 补充 README 一致性检查（如 company 字段 vs README 中提到的公司）
    - 识别用户的专业背景和影响力（organizations 字段）
    - 提供地理位置和社交媒体信息
  - **注意**：`followers` 和 `following` 字段拉取但不计入权重（可能存在刷粉行为）
- **新增 GraphQL 字段**：在 `user_repos.graphql` 中添加用户基本信息字段（bio/company/location/websiteUrl/twitterUsername/followers/following/organizations）。
- **新增 TypeScript 接口**：
  - `UserInfo`（在 `src/scan.ts` 和 `src/analyze.ts` 中）：用户基本信息数据结构
  - `OrganizationNode`（在 `src/scan.ts` 中）：组织节点数据
- **新增辅助函数**：`readOptionalJson<T>()`（在 `src/export.ts` 中）：读取可选的 JSON 文件。

### Changed
- `ProfileJSON` 接口现在包含用户基本信息字段（bio/company/location/websiteUrl/twitterUsername/followers/following/organizations）。
- `fetchAllRepos()` 函数现在返回 `{ repos: RepoNode[]; userInfo: UserInfo }` 对象（而不仅仅是 `RepoNode[]`）。
- `scanUser()` 函数现在会提取用户信息并写入 `out/<login>/raw/user_info.json`。
- `analyzeAll()` 函数现在接受 `userInfo` 参数，并将其添加到 `profile.json` 顶层。
- `reportUser()` 函数现在会读取 `user_info.json` 并传递给 `analyzeAll()`。
- 控制台输出现在会显示 "User info: found and loaded" 或 "User info: not found (may be from older scan)"。

### Technical Details
- 用户信息在第一次 GraphQL 请求时提取（避免重复请求）。
- 如果 `user_info.json` 不存在（如旧版本的 scan 数据），`profile.json` 中的用户信息字段将使用默认值（null 或 0 或空数组）。
- 所有 30 个单元测试通过。
- 真实用户验证通过（Golenspade 和 pablo-abc）。

## 0.0.9

### Added
- **仓库主题标签（Topics）拉取**：新增 `repositoryTopics` 字段，获取仓库的主题标签（如 "react", "typescript", "docker"）。
- **完整语言统计拉取**：新增 `languages` 字段，获取仓库中所有语言的代码量统计（而不仅仅是 `primaryLanguage`）。
- **仓库描述拉取**：新增 `description` 字段，获取仓库的描述文本。
- **语言权重计算 V2**：新增 `computeLanguageWeightsV2()` 函数，基于完整的 `languages.edges` 数据计算语言权重。
  - 考虑语言在仓库中的实际占比（字节数）
  - 使用 `log(1+stars)` 作为仓库权重
  - 提供 `total_bytes` 和 `weighted_bytes` 用于透明度
- **Topics 权重计算**：新增 `computeTopicWeights()` 函数，基于 `repositoryTopics` 数据计算技术栈权重。
  - 统计 topic 出现次数和加权次数
  - 使用 `log(1+stars)` 作为仓库权重
  - 提供 `count` 和 `weighted_count` 用于透明度
- **README Topics 提取**：新增 `extractReadmeTopics()` 函数，从 Profile README 中提取常见技术栈关键词。
  - 支持 70+ 常见技术栈关键词（前端框架、后端框架、数据库、云平台、容器/编排、CI/CD、测试、构建工具、机器学习等）
  - 返回小写形式，便于与 `repositoryTopics` 进行比较
- **一致性检查增强**：`ConsistencySignals` 接口新增 topics 相关字段：
  - `readme_topics` - README 中提到的技术栈/主题
  - `metric_topics` - 行为数据中的 topics
  - `topic_overlap` - 同时出现在自述和行为中的 topics

### Changed
- **GraphQL 查询更新**：`src/queries/user_repos.graphql` 现在会拉取 `description`、`repositoryTopics` 和 `languages` 字段。
- **RepoRecord 接口更新**：新增 `description`、`repositoryTopics` 和 `languages` 字段（可选）。
- **README 一致性检查更新**：`computeReadmeConsistency()` 现在会比较 README 中提到的 topics 与行为数据中的 topics。

### Fixed
- **修复 0 star 仓库被忽略的问题**：`computeLanguageWeights()` 现在会为 0 star 的仓库分配最小权重 1，而不是完全忽略它们。
  - **问题**：之前的逻辑 `if (w <= 0) continue;` 导致所有 0 star 的仓库都被跳过
  - **影响**：新用户或没有 star 的仓库无法生成语言分布图（`skills` 字段为空数组）
  - **修复**：使用 `const weight = w > 0 ? w : 1;` 确保所有有语言的仓库都被计入
  - **验证**：Golenspade 用户（32 个仓库，全部 0 star）现在可以正常生成语言分布图

### Technical Details
- **语言权重算法**：
  - 对每个仓库，计算仓库权重 `w_repo = log(1 + stars)`
  - 对每种语言，计算其在仓库中的占比 `lang_ratio = lang_size / total_size`
  - 累加每种语言的加权权重 `w_lang += w_repo * lang_size`
  - 归一化为 0-1 之间的比例
- **Topics 权重算法**：
  - 对每个仓库，计算仓库权重 `w_repo = log(1 + stars)`
  - 对每个 topic，累加权重 `w_topic += w_repo`
  - 归一化为 0-1 之间的比例

### Tests
- 新增 3 个测试用例：
  - `computeLanguageWeightsV2` 测试（验证基于完整语言数据的权重计算）
  - `computeTopicWeights` 测试（验证 topics 权重计算）
  - `extractReadmeTopics` 测试（验证 README topics 提取和一致性检查）
- 所有 30 个测试通过

### Verified With
- **Golenspade**: 32 repositories, 23 pull requests, 98 commits
- **pablo-abc**: 55 repositories, 50 pull requests, 0 commits
  - 验证了 topics 数据拉取（如 "svelte", "forms", "typescript", "solidjs", "validation"）
  - 验证了 languages 数据拉取（如 "TypeScript", "Astro", "JavaScript", "Svelte", "CSS"）

---

## 0.0.8

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
