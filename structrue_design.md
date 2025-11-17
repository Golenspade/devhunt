上结构！这是按 **Bun + TypeScript 单仓三件套**（采集器 / 分析引擎 / MCP）落地的项目骨架。你可以直接照这套建仓。

```text
devhunt/
├─ bunfig.toml
├─ tsconfig.json
├─ devhunt.config.json             # 默认配置（可被 CLI 参数覆盖）
├─ .env.example                    # 仅示例：GITHUB_TOKEN=...
├─ bin/
│  └─ devhunt.ts                   # CLI 入口（#!/usr/bin/env bun）
├─ packages/
│  ├─ core/                        # 公共类型&工具（路径/日志/gh 调用等）
│  │  ├─ src/
│  │  │  ├─ types.ts              # Profile/ProjectScore 等类型定义
│  │  │  ├─ paths.ts              # ~/.devhunt 路径/落地策略
│  │  │  ├─ logger.ts             # 日志
│  │  │  ├─ exec.ts               # 子进程封装（gh、git、cloc、jscpd）
│  │  │  └─ tz.ts                 # 时区推断与覆盖逻辑
│  │  └─ index.ts
│  │
│  ├─ collector/                   # 数据采集（GraphQL + gh + git）
│  │  ├─ src/
│  │  │  ├─ graphql.ts            # GraphQL 查询模板/分页器
│  │  │  ├─ collect-user.ts       # 拉 user/repos/prs/commits/raw/*.jsonl
│  │  │  ├─ clone-all.ts          # 全量 clone（含并发/跳过大仓）
│  │  │  └─ robots-filter.ts      # 机器人/CI 识别
│  │  └─ index.ts
│  │
│  ├─ analyzer/                    # 规范化入库 + 画像/评分/图表
│  │  ├─ src/
│  │  │  ├─ db.ts                 # SQLite 初始化（better-sqlite3）
│  │  │  ├─ normalize.ts          # raw → SQLite（commit/pr/repo/release）
│  │  │  ├─ dedup.ts              # fork 历史/文件哈希去重
│  │  │  ├─ features-user.ts      # 作息/阶段/UOI/时延/行为代理
│  │  │  ├─ features-project.ts   # A/H/U/R/P/D 六维特征
│  │  │  ├─ static-generic.ts     # cloc/jscpd/tree-sitter（可降级）
│  │  │  ├─ charts.ts             # Vega-Lite 生成 SVG/PNG
│  │  │  ├─ export.ts             # profile.json / projects.jsonl / timeline.csv
│  │  │  └─ report-template.ts    # 可选：空 HTML 模板
│  │  └─ index.ts
│  │
│  └─ mcp/                         # MCP Server（给 Agent 调用）
│     ├─ src/
│     │  ├─ server.ts             # 注册 tools：collect/analyze/get_artifacts
│     │  └─ tools.ts              # 方法签名与参数校验
│     └─ index.ts
│
├─ scripts/                        # 开发便捷脚本（可选）
│  ├─ make-report.ts
│  └─ purge.ts
└─ out/                            # 产物（运行后生成）
```

---

## 关键文件（最小内容）

### bunfig.toml

```toml
[install]
exact = true

[test]
preload = ["./tsconfig.json"]

[run]
bun = true
```

### tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "types": ["bun-types"],
    "strict": true,
    "baseUrl": ".",
    "paths": {
      "@core/*": ["packages/core/src/*"],
      "@collector/*": ["packages/collector/src/*"],
      "@analyzer/*": ["packages/analyzer/src/*"],
      "@mcp/*": ["packages/mcp/src/*"]
    }
  }
}
```

### devhunt.config.json（示例）

```json
{
  "home": "~/.devhunt",
  "timezone": { "override": null },            // 可填 "Asia/Shanghai" 或 "+08:00"
  "clone": { "mode": "full", "concurrency": 4, "maxRepoSizeMB": 1024 },
  "analysis": { "fullStatic": true, "lens": "self" },
  "cache": { "ttlDays": 0 },
  "privacy": { "noTokenPersist": true, "publicOnly": true }
}
```

### bin/devhunt.ts（CLI 入口骨架）

```ts
#!/usr/bin/env bun
import { parseArgs } from "node:util";
import { collectAll } from "@collector/collect-user";
import { analyzeAll } from "@analyzer/index";
import { exportArtifacts } from "@analyzer/export";
import { resolveHome } from "@core/paths";

const { values, positionals } = parseArgs({
  options: {
    token: { type: "string" },
    tz: { type: "string" },
    "full-static": { type: "boolean" },
    "make-report": { type: "boolean" }
  },
  allowPositionals: true
});

const cmd = positionals[0];
const login = positionals[1];
if (!cmd || !login) {
  console.log(`Usage:
  bun devhunt collect <login> --token $GITHUB_TOKEN
  bun devhunt analyze <login> [--tz Asia/Shanghai] [--full-static]
  bun devhunt export  <login> [--make-report]
`);
  process.exit(1);
}

const home = resolveHome();
switch (cmd) {
  case "collect":
    await collectAll({ login, token: values.token ?? process.env.GITHUB_TOKEN, home });
    break;
  case "analyze":
    await analyzeAll({ login, home, tzOverride: values.tz ?? null, fullStatic: !!values["full-static"] });
    break;
  case "export":
    await exportArtifacts({ login, home, makeReport: !!values["make-report"] });
    break;
  default:
    console.error("Unknown command:", cmd);
    process.exit(1);
}
```

### packages/core/src/types.ts（核心类型摘录）

```ts
export type TimeWindow = "lifetime" | "last_12m";

export interface ProfileJSON {
  login: string;
  timezone: { auto: string | null; override: string | null; used: string | null };
  core_hours: Array<{ start: string; end: string }>;
  skills: Array<{ domain: string; share_lifetime: number; evidence: string[] }>;
  uoi: number; // upstream orientation index
  sla: { first_review_p50_h: number | null; merge_p50_h: number | null };
  growth: Array<{ metric: string; window: TimeWindow; delta: number }>;
  behaviors: {
    pr_fix_24h_rate: number | null;
    hot_chase_latency_h: number | null;
    tech_suggestion_ratio: number | null;
  };
  stages: Array<{ range: string; theme: string; rep_repos: string[] }>;
  evidence: Array<{ type: "pr" | "commit" | "issue" | "release"; url: string }>;
}

export interface ProjectScore {
  repo: string; // owner/name
  A: number; H: number; U: number; R: number; P: number; D: number;
  evidence: string[]; // urls
}
```

### packages/collector/src/graphql.ts（查询模板摘录）

```ts
export const Q_USER_REPOS = `
query Repos($login:String!, $after:String) {
  user(login: $login) {
    repositories(first: 50, after:$after, ownerAffiliations: OWNER,
      orderBy:{field:PUSHED_AT, direction: DESC}) {
      pageInfo { hasNextPage endCursor }
      nodes {
        id name isFork isArchived isTemplate stargazerCount forkCount
        primaryLanguage { name }
        licenseInfo { spdxId }
        createdAt pushedAt
        defaultBranchRef {
          name
          target { ... on Commit {
            history(first:100) {
              pageInfo { hasNextPage endCursor }
              nodes {
                oid authoredDate committedDate additions deletions
                author { user { login } }
              }
            }
          }}
        }
      }
    }
  }
}`;
```

### packages/analyzer/src/db.ts（SQLite 初始化片段）

```ts
import Database from "better-sqlite3";

export function openDB(path: string) {
  const db = new Database(path);
  db.exec(`
CREATE TABLE IF NOT EXISTS dev (login TEXT PRIMARY KEY, name TEXT, created_at TEXT);
CREATE TABLE IF NOT EXISTS repo (
  id TEXT PRIMARY KEY, owner TEXT, name TEXT, is_fork INT, is_archived INT, is_template INT,
  main_lang TEXT, stars INT, forks INT, watchers INT, license TEXT, created_at TEXT, pushed_at TEXT
);
CREATE TABLE IF NOT EXISTS commit_event (
  repo_id TEXT, sha TEXT PRIMARY KEY, author_login TEXT,
  authored_at TEXT, committed_at TEXT, tz_offset INT,
  additions INT, deletions INT, files INT
);
CREATE TABLE IF NOT EXISTS pr (
  id TEXT PRIMARY KEY, repo_id TEXT, author_login TEXT,
  created_at TEXT, first_review_at TEXT, merged_at TEXT,
  is_self_merge INT, is_cross_repo INT, reviews INT, additions INT, deletions INT, changed_files INT
);
CREATE TABLE IF NOT EXISTS quality_snap (
  repo_id TEXT, ts TEXT, dup_rate REAL, cc_p90 REAL, func_len_p50 REAL
);
`);
  return db;
}
```

### packages/analyzer/src/charts.ts（Vega-Lite 生成）

```ts
import { writeFile } from "node:fs/promises";
import { compile } from "vega-lite";
import * as vega from "vega";

export async function renderHeatmap(data: Array<{ dow:number; hour:number; commits:number }>, outPath: string) {
  const spec = {
    data: { values: data },
    mark: "rect",
    encoding: {
      x: { field: "hour", type: "ordinal", title: "Hour" },
      y: { field: "dow", type: "ordinal", title: "DOW" },
      size: { value: 100 },
      color: { field: "commits", type: "quantitative" }
    },
    width: 500, height: 180
  };
  const vegaSpec = compile(spec).spec;
  const view = new vega.View(vega.parse(vegaSpec), { renderer: "none" });
  const svg = await view.toSVG();
  await writeFile(outPath, svg);
}
```

### packages/mcp/src/tools.ts（MCP 方法签名）

```ts
export interface CollectArgs { login: string; token?: string | null }
export interface AnalyzeArgs { login: string; tz?: string | null; fullStatic?: boolean }
export interface Artifacts {
  profile_path: string; projects_path: string; charts: string[]; report_path?: string;
}
```

---

## 运行方式（最短闭环）

```bash
# 1) 安装依赖
bun install

# 2) 配 token（或 gh auth login）
export GITHUB_TOKEN=ghp_xxx

# 3) 采集全史
bun devhunt collect <github_login>

# 4) 分析（可指定用户手动时区）
bun devhunt analyze <github_login> --tz Asia/Shanghai --full-static

# 5) 导出产物（图表 & 骨架；可生成空报告模板）
bun devhunt export <github_login> --make-report
```

产物会在：

```
out/<login>/
  profile.json
  projects.jsonl
  timeline.csv
  charts/heatmap.svg
  charts/origin_vs_upstream.svg
  charts/project_radar_<repo>.svg
  report.html
```

---

## 说明 & 你的诉求已经落实

* **运行时**：Bun；**包管理**：bun；
* **时区**：自动推断 + **手动覆盖**（CLI/配置/MCP 参数都支持）；
* **只 GitHub 公共数据**；GraphQL + gh + git；
* **我们的职责**：产出“证据 + 骨架 + 图表”；**AI 写结论**；
* **可降级**：静态分析“有就跑，无则跳过”，不足部分交给模型轻评。

需要我把这棵结构直接在画布里生成一套**可跑的最小模板**（含空实现和命令脚手架）吗？
