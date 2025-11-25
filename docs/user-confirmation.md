# User Confirmation Feature / 用户确认功能

[English](#english) | [中文](#中文)

---

<a name="english"></a>
## 🇬🇧 English

### Overview

Before starting a scan, devhunt displays the target user's basic information, allowing you to confirm whether it's the correct user. This prevents wasting scan time and API quota due to username typos.

### How It Works

1. **First GraphQL query**: During the first request in `fetchAllRepos`, we obtain the user's basic information
2. **Display preview**: Shows user's login, bio, followers, repos, and other key information
3. **Ask for confirmation**: In interactive terminals, asks whether to continue
4. **Continue or cancel**: User inputs `y` to continue, `n` to cancel the scan

### Usage Examples

#### Default Behavior (with confirmation)

```bash
bun devhunt scan A-kirami --window year
```

Output:
```
[devhunt] Scanning GitHub user A-kirami...
[devhunt] Raw output directory: out/A-kirami/raw
[devhunt] Commit time window: since 2024-11-19T14:17:00.000Z

[devhunt] User info preview:
  Username: A-kirami
  Bio: 🌸 Akirami | 🎮 Game Developer | 🤖 Bot Developer
  Company: (none)
  Location: (none)
  Followers: 113
  Following: 78
  Public repos: 78
  Organizations: OpenWebGAL, vuejs, surrealdb

Continue scanning this user? (y/n)
```

#### Skip Confirmation (batch scanning or CI)

```bash
bun devhunt scan A-kirami --window year --yes
# or
bun devhunt scan A-kirami --window year -y
```

This starts scanning immediately without showing the confirmation prompt.

### When Confirmation is Automatically Skipped

Confirmation is automatically skipped in the following cases:

1. **Non-interactive terminal**: CI environments, piped input, etc. (detected via `process.stdin.isTTY`)
2. **Using `--yes` or `-y` flag**: Explicitly skip confirmation

### Design Rationale

#### Why is this feature needed?

In practice, we found the following issues:

1. **Username typos**:
   - Wanted to scan `A-kirami`, but typed `Akirami`
   - Wanted to scan `sansan0`, but typed `sansan`
   - Result: collected data for a completely different user

2. **Huge data quality differences**:
   - `A-kirami`: 113 followers, 78 repos, 392 contributions
   - `Akirami`: 1 follower, 14 repos, 0 contributions
   - Difference of **113x**!

3. **Wasted time and resources**:
   - Scanning a user can take several minutes
   - Consumes GitHub API quota
   - Generates useless data

#### Why confirm after the first query?

1. **No extra API calls**: We're already querying user info, just reusing this data
2. **Catch issues early**: Discover username errors before scanning starts
3. **Provide enough information**: followers, repos, etc. are sufficient to verify the correct user

#### Why support skipping confirmation?

1. **Batch scanning**: When scanning multiple users, don't want to manually confirm each time
2. **CI environment**: Cannot interact in automated workflows
3. **Known users**: No need to re-confirm when rescanning known users

### Implementation Details

#### Code Locations

- **CLI argument parsing**: `src/cli.ts` - adds `yes` option
- **Scan logic**: `src/scan.ts` - adds `confirmUserScan` function
- **GraphQL query**: `src/queries/user_repos.graphql` - adds `totalCount` field
- **CLI entry point**: `bin/devhunt.ts` - passes `skipConfirmation` parameter

#### Key Function

```typescript
async function confirmUserScan(userInfo: UserInfo, repoCount: number): Promise<void> {
  // Auto-continue if not an interactive terminal (e.g., CI)
  if (!process.stdin.isTTY) {
    return;
  }

  // Display user info preview
  console.log("\n[devhunt] User info preview:");
  console.log(`  Username: ${userInfo.login}`);
  console.log(`  Bio: ${userInfo.bio || "(none)"}`);
  // ... more info

  // Ask whether to continue
  console.log("\nContinue scanning this user? (y/n) ");

  // Read user input
  const answer = await new Promise<string>((resolve) => {
    process.stdin.once("data", (data) => {
      resolve(data.toString().trim().toLowerCase());
    });
  });

  if (answer !== "y" && answer !== "yes") {
    throw new Error("User cancelled scan");
  }
}
```

### Future Improvements

Possible enhancements:

1. **Username suggestions**: If username doesn't exist, suggest similar usernames
2. **Fuzzy search**: Use GitHub Search API to find similar users
3. **Batch scan config file**: Create `users.json` file to avoid manual input
4. **Data quality warnings**: After scan completion, warn if data is abnormal (e.g., 0 followers)

---

<a name="中文"></a>
## 🇨🇳 中文

### 功能概述

在开始扫描前，devhunt 会显示目标用户的基本信息，让你确认是否是正确的用户。这可以避免因用户名输入错误而浪费扫描时间和 API 配额。

### 工作原理

1. **第一次 GraphQL 查询**：在 `fetchAllRepos` 的第一次请求时，我们就获取了用户的基本信息
2. **显示预览**：显示用户的 login, bio, followers, repos 等关键信息
3. **询问确认**：在交互式终端中询问用户是否继续
4. **继续或取消**：用户输入 `y` 继续，输入 `n` 取消扫描

### 使用示例

#### 默认行为（带确认）

```bash
bun devhunt scan A-kirami --window year
```

输出：
```
[devhunt] Scanning GitHub user A-kirami...
[devhunt] Raw output directory: out/A-kirami/raw
[devhunt] Commit time window: since 2024-11-19T14:17:00.000Z

[devhunt] 用户信息预览:
  用户名: A-kirami
  简介: 🌸 Akirami | 🎮 Game Developer | 🤖 Bot Developer
  公司: (无)
  位置: (无)
  Followers: 113
  Following: 78
  公开仓库: 78
  组织: OpenWebGAL, vuejs, surrealdb

是否继续扫描此用户？(y/n)
```

#### 跳过确认（批量扫描或 CI 环境）

```bash
bun devhunt scan A-kirami --window year --yes
# 或
bun devhunt scan A-kirami --window year -y
```

这会直接开始扫描，不显示确认提示。

### 自动跳过确认的情况

在以下情况下，确认步骤会自动跳过：

1. **非交互式终端**：如 CI 环境、管道输入等（通过检测 `process.stdin.isTTY`）
2. **使用 `--yes` 或 `-y` 参数**：显式跳过确认

### 设计理念

#### 为什么需要这个功能？

在实际使用中，我们发现了以下问题：

1. **用户名输入错误**：
   - 想扫描 `A-kirami`，却输入了 `Akirami`
   - 想扫描 `sansan0`，却输入了 `sansan`
   - 结果采集了完全不同的用户数据

2. **数据质量差异巨大**：
   - `A-kirami`: 113 followers, 78 repos, 392 contributions
   - `Akirami`: 1 follower, 14 repos, 0 contributions
   - 差异高达 **113 倍**！

3. **浪费时间和资源**：
   - 扫描一个用户可能需要几分钟
   - 消耗 GitHub API 配额
   - 生成无用的数据

#### 为什么在第一次查询后确认？

1. **不引入额外 API 调用**：我们本来就要查询用户信息，只是复用这个数据
2. **尽早发现问题**：在扫描开始前就能发现用户名错误
3. **提供足够的信息**：followers, repos 等信息足以判断是否是正确的用户

#### 为什么支持跳过确认？

1. **批量扫描**：扫描多个用户时，不希望每次都手动确认
2. **CI 环境**：自动化流程中无法交互
3. **已确认的用户**：重新扫描已知用户时，不需要再次确认

### 实现细节

#### 代码位置

- **CLI 参数解析**：`src/cli.ts` - 添加 `yes` 选项
- **扫描逻辑**：`src/scan.ts` - 添加 `confirmUserScan` 函数
- **GraphQL 查询**：`src/queries/user_repos.graphql` - 添加 `totalCount` 字段
- **命令行入口**：`bin/devhunt.ts` - 传递 `skipConfirmation` 参数

#### 关键函数

```typescript
async function confirmUserScan(userInfo: UserInfo, repoCount: number): Promise<void> {
  // 如果不是交互式终端（如 CI 环境），自动继续
  if (!process.stdin.isTTY) {
    return;
  }

  // 显示用户信息预览
  console.log("\n[devhunt] 用户信息预览:");
  console.log(`  用户名: ${userInfo.login}`);
  console.log(`  简介: ${userInfo.bio || "(无)"}`);
  // ... 更多信息

  // 询问是否继续
  console.log("\n是否继续扫描此用户？(y/n) ");

  // 读取用户输入
  const answer = await new Promise<string>((resolve) => {
    process.stdin.once("data", (data) => {
      resolve(data.toString().trim().toLowerCase());
    });
  });

  if (answer !== "y" && answer !== "yes") {
    throw new Error("用户取消扫描");
  }
}
```

### 未来改进

可能的改进方向：

1. **用户名建议**：如果用户名不存在，提供相似的用户名建议
2. **模糊搜索**：使用 GitHub Search API 查找相似用户
3. **批量扫描配置文件**：创建 `users.json` 文件，避免手动输入
4. **数据质量警告**：扫描完成后，如果数据异常（如 0 followers），提示用户检查

### 相关问题

- Issue: 用户名输入错误导致采集错误数据
- 解决方案：在扫描前显示用户信息并确认
- 影响：避免浪费时间和 API 配额，提高数据质量
