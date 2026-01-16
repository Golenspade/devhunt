对！先把 MVP 压到**最小能跑、最少依赖、最快出“人话证据”的形态**。下面是精简版「设计 + 项目结构 + 拉哪些数据 + 算什么 + 输出什么」。

# 🎯 MVP 目标（一句话）

**只用 GitHub API（+ gh CLI），不克隆仓库、不做静态分析**；拉“单个用户的全史关键信息”，算出**语言画像 + 活跃小时分布（近似）+ 上游贡献倾向 + 代表作**，导出**JSON骨架 + 两张图**，供你的 AI 直接写结论。

---

# 🧱 技术栈（MVP）

* 运行时/包管：**Bun**（TypeScript 原生运行，bun install 即可）
* 命令：**gh CLI**（做认证与 GraphQL 调用）
* 存储：**无数据库**（全用 JSON/JSONL 落文件即可）
* 绘图：**Vega-Lite**（Node 端导出 SVG）
* 时区：自动推断为辅，**允许用户手动指定 `--tz`**（你强调的点）

---

# 📁 项目结构（MVP）

```
devhunt-mvp/
├─ bunfig.toml
├─ tsconfig.json
├─ devhunt.config.json            # 可填 tz 覆盖
├─ bin/
│  └─ devhunt.ts                  # CLI：scan / report
├─ src/
│  ├─ gh.ts                       # 用 gh 调 GraphQL 的薄封装
│  ├─ queries/
│  │  ├─ user_repos.graphql
│  │  └─ user_prs.graphql
│  ├─ scan.ts                     # 拉数并写 raw/*.jsonl
│  ├─ analyze.ts                  # 计算画像指标
│  ├─ charts.ts                   # 生成 languages.svg / hours.svg
│  └─ export.ts                   # 组装 profile.json / top_repos.json
└─ out/<login>/
   ├─ raw/
   │  ├─ repos.jsonl
   │  └─ prs.jsonl
   ├─ profile.json                # 给 AI 的骨架
   ├─ top_repos.json
   └─ charts/
      ├─ languages.svg
      └─ hours.svg
```

---

# 🔎 我们从 **哪里** 拉 **哪些** 数据（只 GraphQL）

> 全程只读公开数据；Token 用 `GITHUB_TOKEN` 或 `gh auth login`

**① 用户仓库（全史概览）**
`user(repositories)` 拉字段：

* `name, isFork, isArchived, primaryLanguage.name, stargazerCount, forkCount, createdAt, pushedAt, watchers.totalCount, licenseInfo.spdxId`

**② 用户发起的 PR（跨库贡献）**
`user(pullRequests)` 拉字段：

* `createdAt, mergedAt, closedAt, repository{name, owner{login}}, isCrossRepository, additions, deletions, changedFiles`
* 用 `repository.owner.login == <user>` 来区分**自仓 PR** vs **外部 PR**（上游贡献）

> 说明：**活跃小时分布** MVP 版用 **PR 的 createdAt** 近似（全史可得），先不拉 commit 级历史（太重）。后续要更细再加。

---

# 🧮 我们**算**什么（MVP 指标）

**A. 语言画像（Skills）**

* 统计每个 `primaryLanguage` 的**权重**：`Σ log(1+stars)`（对大仓更敏感）
* 输出：Top 语言及占比（终身）

**B. 活跃小时分布（Hours）**

* 用 **PR.createdAt** 的小时数做 24 桶直方（加上 `--tz` 手动覆盖）
* 输出：`core_hours`（Top2 小时段，如 15:00–01:00）

**C. 上游倾向（UOI）**

* `UOI = 外部PR数 / (外部PR数 + 自仓PR数)`（终身）

**D. 外部 PR 合并率（简版协作）**

* `accept_rate = 外部 merged PR / 外部 total PR`

**E. 代表作（Top Repos）**

* 评分：`score = stars^0.6 * recency_factor`

  * `recency_factor = 1 + 0.3 * I(近12个月有 push)`
* 输出 Top5 仓（含是否 fork、语言、stars）

---

# 📦 我们**导出**什么（给 AI 吃）

**`profile.json`（MVP 字段）**

```json
{
  "login": "alice",
  "timezone": {"auto": "+08:00", "override": "Asia/Shanghai", "used": "Asia/Shanghai"},
  "skills": [{"lang":"TypeScript","weight":0.62},{"lang":"Go","weight":0.21}],
  "core_hours": [{"start":"15:00","end":"01:00"}],
  "uoi": 0.47,
  "external_pr_accept_rate": 0.71,
  "summary_evidence": {
    "sample_prs": ["https://github.com/.../pull/123", "..."],
    "sample_repos": ["https://github.com/alice/ts-lib", "..."]
  }
}
```

**`top_repos.json`**

```json
[
  {"repo":"alice/ts-lib","lang":"TypeScript","stars":820,"score":1.93,"isFork":false,"lastPush":"2025-09-12"},
  {"repo":"alice/go-tool","lang":"Go","stars":210,"score":1.15,"isFork":false,"lastPush":"2024-12-28"}
]
```

**图表**

* `charts/languages.svg`：语言权重条形图
* `charts/hours.svg`：24 小时活跃直方（含 tz 说明）

---

# 🖥️ CLI（两条命令就够）

```bash
# 1) 扫一位用户（全史 GraphQL + 写 raw）
bun devhunt scan <login> --token $GITHUB_TOKEN

# 2) 生成画像与图表（可手动时区）
bun devhunt report <login> --tz Asia/Shanghai
```

> `scan` 只调用 GraphQL；`report` 读 `raw/` 算指标 → 写 `profile.json / top_repos.json / charts/*.svg`

---

# 📝 GraphQL 查询模板（MVP 用两张）

**`queries/user_repos.graphql`**

```graphql
query Repos($login:String!, $after:String) {
  user(login:$login) {
    repositories(first:50, after:$after, ownerAffiliations:OWNER, orderBy:{field:PUSHED_AT, direction:DESC}) {
      pageInfo { hasNextPage endCursor }
      nodes {
        name isFork isArchived primaryLanguage { name }
        stargazerCount forkCount watchers { totalCount }
        licenseInfo { spdxId } createdAt pushedAt
        owner { login }
      }
    }
  }
}
```

**`queries/user_prs.graphql`**

```graphql
query PRs($login:String!, $after:String) {
  user(login:$login) {
    pullRequests(first:100, after:$after, orderBy:{field:CREATED_AT, direction:DESC}, states:[OPEN,MERGED,CLOSED]) {
      pageInfo { hasNextPage endCursor }
      nodes {
        createdAt mergedAt closedAt isCrossRepository
        additions deletions changedFiles
        repository { name owner { login } }
        url
      }
    }
  }
}
```

---

# ⏭️ 下一步（MVP→后续）

* ✅ MVP：**GraphQL-only** / 不克隆 / 两张图 / 两个 JSON
* ⬆️ v0.2：加「阶段划分（变点检测）」「追热点延迟」「代表作小卡片的证据句」
* ⬆️ v0.3：可选 MCP server（3 个 tool），供 Agent 即插即用
* ⬆️ v1.x：需要时再接 **tree-sitter/静态分析** 与“项目六维”完整版

---

如果这版 OK，我可以把 **`bin/devhunt.ts` 的最小骨架**（含 `scan/report`）也写给你，直接能跑出 `profile.json + charts`。
