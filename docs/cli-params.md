# devhunt CLI 参数说明

本文件专门说明 `devhunt` 命令行工具的参数和开关，用于后续 README 引用。

---

## 1. 总体说明

命令入口：

```bash
bun devhunt <command> [...args]
```

当前支持两个子命令：

- `scan`  —— 扫描指定 GitHub 用户，拉取原始数据（repos / PRs / commits）
- `report` —— 基于已有原始数据生成画像报告和图表

所有输出默认写到项目根目录下的 `out/<login>/` 目录。

---

## 2. `scan` 子命令

**用法：**

```bash
bun devhunt scan <login> --token $GITHUB_TOKEN [--window quarter|half|year|3y|all]
```

### 2.1 位置参数

- `<login>`
  - 必选。
  - 要扫描的 GitHub 用户名（login），例如：`torvalds`、`Golenspade`。
  - 扫描结果会写入：`out/<login>/raw/`。

### 2.2 选项参数

#### 2.2.1 `--token <token>`

- **是否必选：** 对扫描来说是强推荐；如果不传，`devhunt` 会尝试使用环境变量。
- **作用：** 用于调用 GitHub GraphQL API 的访问令牌。
- **优先级：**
  1. 命令行参数 `--token <token>`
  2. 环境变量 `GITHUB_TOKEN`
  3. 环境变量 `GH_TOKEN`
- **建议：** 使用 Fine-grained Personal Access Token，只需要访问公开仓库的权限即可。

若三者都未配置，`scan` 会因认证错误失败，并给出中文错误提示。

#### 2.2.2 `--window <window>`

- **是否必选：** 否，默认值为 `year`。
- **作用：** 控制「commit 拉取的时间窗口」，用于限制 `commits.jsonl` 中包含的 commit 范围。
- **可选取值：**
  - `quarter` —— 最近 1 个季度（约 90 天）
  - `half`    —— 最近半年（约 182 天）
  - `year`    —— 最近 1 年（365 天）
  - `3y`      —— 最近 3 年
  - `all`     —— 不限制时间，拉取默认分支上该用户的全部 commit 历史
- **默认行为：**
  - 如果不指定 `--window`，等价于 `--window year`。
  - 内部会计算一个 `since` 时间戳，只拉取 `authoredDate >= since` 的 commit；
  - 选择 `all` 时，不传 `since` 参数，相当于“全量历史”。

执行时，终端会打印当前使用的时间窗口，例如：

- `[devhunt] Commit time window: since 2023-01-01T00:00:00.000Z`
- `[devhunt] Commit time window: full history`

### 2.3 `scan` 的输出文件

`scan` 成功后，会在项目根目录下生成以下文件：

- `out/<login>/raw/repos.jsonl`
  - 该用户的自有仓库列表（GitHub `user.repositories` 的原始数据）。
- `out/<login>/raw/prs.jsonl`
  - 该用户发起的拉取请求列表（GitHub `user.pullRequests` 的原始数据）。
- `out/<login>/raw/commits.jsonl`
  - 该用户作为 author 的 commit 列表：
    - 只包含默认分支上的 commit；
    - 根据 `--window` 对时间进行截断；
    - 每条记录包含：时间、message、行数/文件数规模、作者邮箱及域名分类、关联 PR 和母仓信息等。

后续分析阶段会以这些原始 JSONL 文件为输入。

---

## 3. `report` 子命令

**用法：**

```bash
bun devhunt report <login> [--tz Asia/Shanghai]
```

### 3.1 位置参数

- `<login>`
  - 必选。
  - 要生成报告的 GitHub 用户名。
  - 需要在此之前已经执行过 `bun devhunt scan <login> ...`，保证 `out/<login>/raw/` 下有数据。

### 3.2 选项参数

#### 3.2.1 `--tz <IANA 时区名>`

- **是否必选：** 否。
- **作用：** 用于画像中涉及「本地化时间」的分析维度（如活跃时段分布）。
- **例子：**
  - `--tz Asia/Shanghai`
  - `--tz Europe/Berlin`
  - `--tz America/Los_Angeles`
- **默认行为：**
  - 若不指定，则使用分析模块内置的默认/推断逻辑。
  - 报告仍可生成，只是「本地时间」含义会稍弱一些。

### 3.3 `report` 的输出文件

`report` 成功后，会在 `out/<login>/` 下生成：

- `profile.json` —— 开发者画像的核心 JSON 数据；
- `top_repos.json` —— Top 仓库及其得分与证据；
- `charts/`
  - `languages.svg` —— 语言分布图；
  - `hours.svg` —— 活跃时段分布图；
  - 以及未来可能新增的图表文件。

---

## 4. 错误处理（简要）

`devhunt` 对常见错误做了分类和中文提示，方便排查：

- 网络错误（network）：无法访问 GitHub API；
- Token 授权错误（auth）：Token 未配置/过期/权限不够；
- 目标用户不可达（not_found）：login 不存在或不可访问；
- 分析错误（analysis）：本地依赖问题或分析代码 bug；
- CLI 环境错误（cli）：本地 GitHub CLI (`gh`) 不可用等。

详细错误信息会打印在终端中，可用于进一步定位问题。

