# Changelog

_版本号规则：pround.normal.shame（对应 major.minor.patch，分别代表「大版本」「普通功能版本」「羞耻补丁」）。_

## 0.0.6

> 当前版本（pround=0, normal=0, shame=6）。

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
