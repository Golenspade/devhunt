# Changelog

_版本号规则：pround.normal.shame（对应 major.minor.patch，分别代表「大版本」「普通功能版本」「羞耻补丁」）。_

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
