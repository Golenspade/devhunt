/**
 * 数据扫描模块
 *
 * 负责从 GitHub GraphQL API 拉取用户的原始数据，包括：
 * - 仓库列表（repositories）
 * - Pull Request 列表（pullRequests）
 * - Commit 历史（commits on default branch）
 * - Profile README（如果存在）
 *
 * 设计理念：
 * - 只拉取公开数据，不克隆仓库到本地（MVP 版本）
 * - 使用 GraphQL 分页机制，支持大量数据
 * - 原始数据以 JSONL 格式存储，便于后续分析
 * - 支持时间窗口参数，限制 commit 拉取范围
 *
 * 参考文档：
 * - mvp.md 中的数据拉取策略（只用 GitHub API，不克隆仓库）
 * - CHANGELOG.md v0.0.4 中的 commit 拉取功能
 * - pod.md 中的"以人为本 & 全史视角"理念
 */

import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { graphqlFromFile } from "./gh";
import type { GitHubClientOptions } from "./gh";
import { GitHubNotFoundError } from "./errors";
import { parseEmailInfo } from "./email";

/**
 * GitHub GraphQL 仓库连接响应
 *
 * 对应 user.repositories 查询的返回结构。
 *
 * v0.0.10: 新增用户基本信息字段（bio/company/location/websiteUrl/twitterUsername/followers/following/organizations）
 */
interface ReposConnection {
  user: {
    // v0.0.10: 用户基本信息（高可信度字段）
    bio: string | null;
    company: string | null;
    location: string | null;
    websiteUrl: string | null;
    twitterUsername: string | null;
    followers: { totalCount: number };
    following: { totalCount: number };
    organizations: {
      nodes: OrganizationNode[];
    };

    repositories: {
      totalCount: number;
      pageInfo: { hasNextPage: boolean; endCursor: string | null };
      nodes: RepoNode[];
    };
  } | null;
}

/**
 * 组织节点数据
 *
 * 包含用户所属组织的基本信息。
 *
 * v0.0.10: 用于识别用户的专业背景和影响力
 */
interface OrganizationNode {
  login: string;
  name: string | null;
  description: string | null;
  websiteUrl: string | null;
}

/**
 * 仓库主题（Topic）节点数据
 *
 * 包含仓库的主题标签信息。
 *
 * 字段说明：
 * - topic.name: 主题名称（如 "react", "typescript", "machine-learning"）
 */
interface RepositoryTopicNode {
  topic: {
    name: string;
  };
}

/**
 * 语言节点数据
 *
 * 包含仓库中使用的编程语言及其代码量统计。
 *
 * 字段说明：
 * - name: 语言名称（如 "TypeScript", "Python"）
 * - size: 该语言的代码字节数
 */
interface LanguageEdge {
  size: number;
  node: {
    name: string;
  };
}

/**
 * 仓库节点数据
 *
 * 包含仓库的基本信息和统计数据。
 *
 * 设计理念：
 * - v0.0.9 新增 description、repositoryTopics、languages 字段
 * - repositoryTopics 用于识别技术栈（比 primaryLanguage 更丰富）
 * - languages 提供完整的语言分布（而不仅仅是主语言）
 * - description 用于提取项目关键词和类型
 */
interface RepoNode {
  name: string;
  isFork: boolean;
  isArchived: boolean;
  primaryLanguage: { name: string } | null;
  stargazerCount: number;
  forkCount: number;
  watchers?: { totalCount: number } | null;
  licenseInfo?: { spdxId: string | null } | null;
  createdAt: string;
  pushedAt: string | null;
  owner: { login: string };
  description: string | null;
  repositoryTopics: {
    nodes: RepositoryTopicNode[];
  };
  languages: {
    edges: LanguageEdge[];
  } | null;
}

/**
 * GitHub GraphQL Pull Request 连接响应
 *
 * 对应 user.pullRequests 查询的返回结构。
 */
interface PRsConnection {
  user: {
    pullRequests: {
      pageInfo: { hasNextPage: boolean; endCursor: string | null };
      nodes: PRNode[];
    };
  } | null;
}

/**
 * Pull Request 节点数据
 *
 * 包含 PR 的基本信息和代码变更统计。
 */
interface PRNode {
  createdAt: string;
  mergedAt: string | null;
  closedAt: string | null;
  isCrossRepository: boolean;
  additions: number;
  deletions: number;
  changedFiles: number;
  repository: { name: string; owner: { login: string } };
  url: string;
}

/**
 * 用户 ID 查询结果
 *
 * 用于获取用户的 GitHub 内部 ID（用于 commit 查询的 author 过滤）。
 */
interface UserIdResult {
  user: { id: string } | null;
}

/**
 * 用户基本信息（输出到 user_info.json 的格式）
 *
 * v0.0.10: 新增用户基本信息存储
 *
 * 包含用户的公开个人信息，这些字段具有高可信度（直接来自 GitHub 用户设置）。
 *
 * 设计理念：
 * - 这些字段是用户主动填写的，具有高可信度
 * - 可用于 README 一致性检查（如 company 字段 vs README 中提到的公司）
 * - followers/following 数据拉取但不计入权重（可能存在刷粉行为）
 * - organizations 用于识别用户的专业背景和影响力
 *
 * 参考文档：
 * - pod.md 中的"高可信度字段"理念
 * - GitHub GraphQL API User 对象文档
 */
export interface UserInfo {
  /** GitHub 用户名 */
  login: string;
  /** 用户简介 */
  bio: string | null;
  /** 公司/组织 */
  company: string | null;
  /** 地理位置 */
  location: string | null;
  /** 个人网站 URL */
  websiteUrl: string | null;
  /** Twitter 用户名 */
  twitterUsername: string | null;
  /** 关注者数量（拉取但不计入权重） */
  followers: number;
  /** 关注数量（拉取但不计入权重） */
  following: number;
  /** 所属组织列表（最多 10 个） */
  organizations: {
    login: string;
    name: string | null;
    description: string | null;
    websiteUrl: string | null;
  }[];
}

/**
 * GitHub GraphQL 贡献统计响应
 *
 * 对应 user.contributionsCollection 查询的返回结构。
 *
 * 设计理念：
 * - 获取用户在指定时间范围内的完整贡献统计
 * - 包含 commits、issues、PRs、reviews 等多维度数据
 * - 支持贡献日历（热力图）数据
 * - 可用于评估用户活跃度和贡献模式
 */
interface ContributionsCollectionResult {
  user: {
    contributionsCollection: ContributionsCollectionNode;
  } | null;
}

/**
 * 贡献统计节点数据
 *
 * 包含用户在指定时间范围内的所有贡献统计信息。
 *
 * 字段说明：
 * - totalCommitContributions: 总提交数
 * - totalIssueContributions: 总 Issue 数（创建的）
 * - totalPullRequestContributions: 总 PR 数（创建的）
 * - totalPullRequestReviewContributions: 总 PR Review 数
 * - totalRepositoriesWithContributedCommits: 贡献过 commit 的仓库数
 * - totalRepositoriesWithContributedIssues: 创建过 issue 的仓库数
 * - totalRepositoriesWithContributedPullRequests: 创建过 PR 的仓库数
 * - totalRepositoriesWithContributedPullRequestReviews: 进行过 PR review 的仓库数
 * - totalRepositoryContributions: 创建的仓库数
 * - restrictedContributionsCount: 私有仓库贡献数（如果用户启用了私有贡献计数）
 * - contributionCalendar: 贡献日历（热力图数据）
 * - startedAt: 统计开始时间
 * - endedAt: 统计结束时间
 */
interface ContributionsCollectionNode {
  totalCommitContributions: number;
  totalIssueContributions: number;
  totalPullRequestContributions: number;
  totalPullRequestReviewContributions: number;
  totalRepositoriesWithContributedCommits: number;
  totalRepositoriesWithContributedIssues: number;
  totalRepositoriesWithContributedPullRequests: number;
  totalRepositoriesWithContributedPullRequestReviews: number;
  totalRepositoryContributions: number;
  restrictedContributionsCount: number;
  contributionCalendar: ContributionCalendar;
  startedAt: string;
  endedAt: string;
}

/**
 * 贡献日历数据
 *
 * 包含用户的贡献热力图数据，按周和天组织。
 *
 * 字段说明：
 * - totalContributions: 总贡献数（所有类型的贡献总和）
 * - weeks: 按周组织的贡献数据
 * - colors: 热力图颜色列表（从低到高）
 */
interface ContributionCalendar {
  totalContributions: number;
  weeks: ContributionCalendarWeek[];
  colors: string[];
}

/**
 * 贡献日历周数据
 *
 * 包含一周内每天的贡献数据。
 *
 * 字段说明：
 * - contributionDays: 该周内每天的贡献数据
 */
interface ContributionCalendarWeek {
  contributionDays: ContributionCalendarDay[];
}

/**
 * 贡献日历天数据
 *
 * 包含某一天的贡献统计。
 *
 * 字段说明：
 * - date: 日期（YYYY-MM-DD 格式）
 * - contributionCount: 该天的贡献数
 * - color: 该天在热力图中的颜色
 * - contributionLevel: 贡献等级（NONE, FIRST_QUARTILE, SECOND_QUARTILE, THIRD_QUARTILE, FOURTH_QUARTILE）
 */
interface ContributionCalendarDay {
  date: string;
  contributionCount: number;
  color: string;
  contributionLevel: string;
}

/**
 * 仓库 Commit 连接响应
 *
 * 对应 repository.defaultBranchRef.target.history 查询的返回结构。
 */
interface RepoCommitsConnection {
  repository: {
    name: string;
    owner: { login: string };
    isFork: boolean;
    defaultBranchRef: {
      name: string;
      target: {
        history: {
          pageInfo: { hasNextPage: boolean; endCursor: string | null };
          nodes: CommitNode[];
        };
      } | null;
    } | null;
  } | null;
}

/**
 * Commit 节点数据
 *
 * 包含 commit 的详细信息，包括：
 * - 基本信息（SHA、时间、消息）
 * - 代码变更统计（additions/deletions/changedFiles）
 * - 作者和提交者信息（含邮箱）
 * - 关联的 Pull Request（如果有）
 */
interface CommitNode {
  oid: string;
  authoredDate: string;
  committedDate: string;
  messageHeadline: string;
  messageBody: string | null;
  additions: number;
  deletions: number;
  changedFiles: number;
  parents: { totalCount: number };
  author: {
    name: string | null;
    email: string | null;
    user: { login: string } | null;
  } | null;
  committer: {
    name: string | null;
    email: string | null;
    user: { login: string } | null;
  } | null;
  associatedPullRequests: {
    nodes: AssociatedPullRequestNode[];
  };
}

/**
 * 关联的 Pull Request 节点数据
 *
 * 包含与 commit 关联的 PR 的详细信息，包括：
 * - PR 基本信息（编号、URL、状态）
 * - 分支信息（base/head）
 * - 母仓信息（baseRepository/headRepository）
 *
 * 用于分析：
 * - Commit 是否通过 PR 合并
 * - PR 是否为跨仓贡献（isCrossRepository）
 * - 母仓的影响力（stargazerCount）
 */
interface AssociatedPullRequestNode {
  number: number;
  url: string;
  state: "OPEN" | "MERGED" | "CLOSED";
  createdAt: string;
  mergedAt: string | null;
  closedAt: string | null;
  isCrossRepository: boolean;
  baseRefName: string | null;
  headRefName: string | null;
  baseRepository: {
    owner: { login: string };
    name: string;
    stargazerCount: number;
    pullRequests: { totalCount: number };
    defaultBranchRef: { name: string } | null;
  } | null;
  headRepository: {
    owner: { login: string };
    name: string;
    stargazerCount: number;
    isFork: boolean;
  } | null;
}

/**
 * Commit 记录（输出到 commits.jsonl 的格式）
 *
 * 这是经过处理和增强的 commit 数据，包含：
 * - 仓库信息（含是否为自有仓库的标记）
 * - Commit 基本信息（SHA、时间、消息）
 * - 代码变更统计
 * - 作者信息（含邮箱域名和 TLD 分类）
 * - 关联的 PR 信息（含母仓详情）
 *
 * 参考文档：CHANGELOG.md v0.0.4 中的 commits.jsonl 输出格式
 */
interface CommitRecord {
  /** 仓库信息 */
  repo: {
    owner: string;
    name: string;
    isOwn: boolean;  // 是否为用户自有仓库
  };
  /** Commit SHA */
  sha: string;
  /** 作者时间（authoredDate） */
  authoredAt: string;
  /** 提交时间（committedDate） */
  committedAt: string;
  /** Commit 消息标题 */
  messageHeadline: string;
  /** Commit 消息正文 */
  messageBody: string | null;
  /** 是否为 merge commit（parents > 1） */
  isMerge: boolean;
  /** 代码变更统计 */
  stats: {
    additions: number;
    deletions: number;
    changedFiles: number;
  };
  /** 作者信息（含邮箱分类） */
  author: {
    login: string | null;
    name: string | null;
    email: string | null;
    emailDomain: string | null;
    emailTld: ".edu" | ".gov" | ".org" | "other";
  };
  /** 关联的 PR 列表（含母仓详情） */
  associatedPRs: {
    number: number;
    url: string;
    state: "OPEN" | "MERGED" | "CLOSED";
    isMerged: boolean;
    baseRef: string | null;
    headRef: string | null;
    isCrossRepository: boolean;
    createdAt: string;
    mergedAt: string | null;
    closedAt: string | null;
    baseRepo: {
      owner: string;
      name: string;
      stargazerCount: number;
      totalPrCount: number | null;
      defaultBranch: string | null;
    } | null;
    headRepo: {
      owner: string;
      name: string;
      stargazerCount: number | null;
      totalPrCount: number | null;
      isFork: boolean | null;
    } | null;
  }[];
}

/**
 * Profile README 查询结果
 *
 * 对应查询用户的 Profile README 仓库（<username>/<username>）。
 */
interface ProfileReadmeQuery {
  repository: {
    name: string;
    owner: { login: string };
    isPrivate: boolean;
    defaultBranchRef: { name: string } | null;
    object: { text: string | null } | null;
  } | null;
}

/**
 * 扫描选项
 *
 * 传递给 scanUser 函数的参数。
 */
export interface ScanOptions extends GitHubClientOptions {
  /** GitHub 用户名 */
  login: string;
  /** 输出目录（默认为 out/<login>） */
  outDir?: string;
  /** Commit 拉取的起始时间（ISO 8601 格式，null 表示不限制） */
  since?: string | null;
  /** 跳过用户确认（用于批量扫描或 CI 环境） */
  skipConfirmation?: boolean;
}

// GraphQL 查询文件路径
const reposQueryPath = new URL("./queries/user_repos.graphql", import.meta.url).pathname;
const prsQueryPath = new URL("./queries/user_prs.graphql", import.meta.url).pathname;
const userIdQueryPath = new URL("./queries/user_id.graphql", import.meta.url).pathname;
const repoCommitsQueryPath = new URL("./queries/repo_commits.graphql", import.meta.url).pathname;
const profileReadmeQueryPath = new URL("./queries/profile_readme.graphql", import.meta.url).pathname;
const contributionsQueryPath = new URL("./queries/user_contributions.graphql", import.meta.url).pathname;

/**
 * 显示用户信息预览并询问是否继续扫描
 *
 * 在开始扫描前，显示用户的基本信息（login, bio, followers, repos 等），
 * 让用户确认是否是正确的用户。这可以避免因用户名输入错误而浪费扫描时间。
 *
 * @param userInfo - 用户基本信息
 * @param repoCount - 仓库总数
 * @throws {Error} 如果用户取消扫描
 *
 * 设计理念：
 * - 只在交互式终端中询问（通过检测 stdin.isTTY）
 * - 可以通过 skipConfirmation 参数跳过（用于批量扫描或 CI 环境）
 * - 显示关键信息帮助用户判断是否是正确的用户
 */
async function confirmUserScan(userInfo: UserInfo, repoCount: number): Promise<void> {
  // 如果不是交互式终端（如 CI 环境），自动继续
  if (!process.stdin.isTTY) {
    return;
  }

  // 显示用户信息预览
  console.log("\n[devhunt] 用户信息预览:");
  console.log(`  用户名: ${userInfo.login}`);
  console.log(`  简介: ${userInfo.bio || "(无)"}`);
  console.log(`  公司: ${userInfo.company || "(无)"}`);
  console.log(`  位置: ${userInfo.location || "(无)"}`);
  console.log(`  Followers: ${userInfo.followers}`);
  console.log(`  Following: ${userInfo.following}`);
  console.log(`  公开仓库: ${repoCount}`);

  if (userInfo.organizations.length > 0) {
    console.log(`  组织: ${userInfo.organizations.map((org) => org.login).join(", ")}`);
  }

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

  console.log(); // 空行，让输出更清晰
}

/**
 * 扫描 GitHub 用户的所有公开数据
 *
 * 这是数据拉取的主入口函数，执行以下步骤：
 * 1. 创建输出目录（out/<login>/raw）
 * 2. 并行拉取：用户 ID、仓库列表、PR 列表、Profile README
 * 3. 串行拉取：所有仓库的 commit 历史（需要用户 ID 作为过滤条件）
 * 4. 将原始数据写入 JSONL 文件
 *
 * @param options - 扫描选项（包含用户名、输出目录、时间窗口等）
 *
 * 输出文件：
 * - out/<login>/raw/repos.jsonl - 仓库列表
 * - out/<login>/raw/prs.jsonl - PR 列表
 * - out/<login>/raw/commits.jsonl - Commit 历史
 * - out/<login>/raw/contributions.json - 贡献统计
 * - out/<login>/raw/user_info.json - 用户基本信息（v0.0.10 新增）
 * - out/<login>/raw/profile_readme.md - Profile README（如果存在）
 *
 * 设计理念：
 * - 并行拉取独立数据源，提高效率
 * - Commit 拉取需要用户 ID，因此在第二阶段执行
 * - 使用 JSONL 格式存储，便于流式处理和增量更新
 * - 支持时间窗口参数（since），限制 commit 拉取范围
 *
 * 参考文档：
 * - mvp.md 中的数据拉取策略
 * - CHANGELOG.md v0.0.4 中的 commits.jsonl 输出
 */
export async function scanUser(options: ScanOptions): Promise<void> {
  const { login } = options;
  const baseOut = options.outDir ?? join("out", login);
  const rawOut = join(baseOut, "raw");

  console.log(`[devhunt] Scanning GitHub user ${login}...`);
  console.log(`[devhunt] Raw output directory: ${rawOut}`);

  const since = options.since ?? null;
  if (since) {
    console.log(`[devhunt] Commit time window: since ${since}`);
  } else {
    console.log("[devhunt] Commit time window: full history");
  }

  // 创建输出目录
  await mkdir(rawOut, { recursive: true });

  // 计算贡献统计的时间范围（默认为最近一年）
  const contributionsTo = new Date().toISOString();
  const contributionsFrom = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString();

  // 第一阶段：并行拉取独立数据源
  const [authorId, reposResult, prs, profileReadme, contributions] = await Promise.all([
    fetchUserId(login, options),
    fetchAllRepos(login, reposQueryPath, options, options.skipConfirmation ?? false),
    fetchAllPRs(login, prsQueryPath, options),
    fetchProfileReadme(login, options),
    fetchContributionsCollection(login, contributionsFrom, contributionsTo, options),
  ]);

  // v0.0.10: 解构仓库列表和用户信息
  const { repos, userInfo } = reposResult;

  // 第二阶段：拉取 commit 历史（需要 authorId 作为过滤条件）
  const commits = await fetchAllCommits(login, authorId, repos, since, options);

  console.log(
    `[devhunt] Fetched ${repos.length} repositories, ${prs.length} pull requests, ${commits.length} commits and contributions data`,
  );

  // 转换为 JSONL 格式
  const reposJsonl = repos.map((r) => JSON.stringify(r)).join("\n") + (repos.length ? "\n" : "");
  const prsJsonl = prs.map((p) => JSON.stringify(p)).join("\n") + (prs.length ? "\n" : "");
  const commitsJsonl =
    commits.map((c) => JSON.stringify(c)).join("\n") + (commits.length ? "\n" : "");
  const contributionsJson = JSON.stringify(contributions, null, 2);
  const userInfoJson = JSON.stringify(userInfo, null, 2); // v0.0.10: 用户信息 JSON
  const profileReadmeText = profileReadme && profileReadme.trim().length > 0 ? profileReadme : null;

  // 写入文件
  console.log("[devhunt] Writing raw JSONL files...");
  await writeFile(join(rawOut, "repos.jsonl"), reposJsonl, "utf8");
  await writeFile(join(rawOut, "prs.jsonl"), prsJsonl, "utf8");
  await writeFile(join(rawOut, "commits.jsonl"), commitsJsonl, "utf8");
  await writeFile(join(rawOut, "contributions.json"), contributionsJson, "utf8");
  await writeFile(join(rawOut, "user_info.json"), userInfoJson, "utf8"); // v0.0.10: 写入用户信息
  if (profileReadmeText) {
    await writeFile(join(rawOut, "profile_readme.md"), profileReadmeText, "utf8");
  }

  console.log("[devhunt] Raw data written to:");
  console.log(`  - ${join(rawOut, "repos.jsonl")}`);
  console.log(`  - ${join(rawOut, "prs.jsonl")}`);
  console.log(`  - ${join(rawOut, "commits.jsonl")}`);
  console.log(`  - ${join(rawOut, "contributions.json")}`);
  console.log(`  - ${join(rawOut, "user_info.json")}`); // v0.0.10: 打印用户信息文件
  if (profileReadmeText) {
    console.log(`  - ${join(rawOut, "profile_readme.md")}`);
  } else {
    console.log("  - (no public profile README found)");
  }

  console.log("[devhunt] Scan complete.");
}

/**
 * 拉取用户的所有仓库和用户基本信息
 *
 * 使用 GraphQL 分页机制，拉取用户的所有公开仓库（包括 fork 和 archived）。
 *
 * v0.0.10: 同时提取用户基本信息（bio/company/location/websiteUrl/twitterUsername/followers/following/organizations）
 *
 * @param login - GitHub 用户名
 * @param queryPath - GraphQL 查询文件路径
 * @param options - GitHub 客户端选项（token 等）
 * @returns 包含仓库列表和用户信息的对象
 *
 * 分页逻辑：
 * 1. 初始请求：after = null
 * 2. 检查 pageInfo.hasNextPage
 * 3. 如果有下一页，使用 pageInfo.endCursor 作为 after 参数
 * 4. 重复直到没有下一页
 *
 * 设计理念：
 * - 拉取所有仓库（不过滤 fork 和 archived），便于后续分析
 * - 使用 GraphQL 分页，避免单次请求数据过大
 * - 如果用户不存在，抛出 GitHubNotFoundError
 * - v0.0.10: 在第一次请求时提取用户信息（避免重复请求）
 */
async function fetchAllRepos(
  login: string,
  queryPath: string,
  options: GitHubClientOptions,
  skipConfirmation: boolean = false,
): Promise<{ repos: RepoNode[]; userInfo: UserInfo }> {
  const all: RepoNode[] = [];
  let after: string | null = null;
  let userInfo: UserInfo | null = null;

  // 分页拉取所有仓库
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const data: ReposConnection = await graphqlFromFile<ReposConnection>(
      queryPath,
      { login, after },
      options,
    );

    if (!data.user) {
      throw new GitHubNotFoundError(`GitHub user '${login}' not found or inaccessible`, data);
    }

    // v0.0.10: 在第一次请求时提取用户信息
    if (!userInfo) {
      userInfo = {
        login,
        bio: data.user.bio,
        company: data.user.company,
        location: data.user.location,
        websiteUrl: data.user.websiteUrl,
        twitterUsername: data.user.twitterUsername,
        followers: data.user.followers.totalCount,
        following: data.user.following.totalCount,
        organizations: data.user.organizations.nodes.map((org) => ({
          login: org.login,
          name: org.name,
          description: org.description,
          websiteUrl: org.websiteUrl,
        })),
      };

      // 在第一次获取用户信息后，显示预览并询问是否继续
      if (!skipConfirmation) {
        await confirmUserScan(userInfo, data.user.repositories.totalCount);
      }
    }

    const conn = data.user.repositories;

    if (conn.nodes && conn.nodes.length > 0) {
      all.push(...conn.nodes);
    }

    if (!conn.pageInfo.hasNextPage) break;
    after = conn.pageInfo.endCursor;
  }

  return { repos: all, userInfo: userInfo! };
}

/**
 * 拉取用户的所有 Pull Request
 *
 * 使用 GraphQL 分页机制，拉取用户创建的所有 PR（包括自有仓库和外部仓库）。
 *
 * @param login - GitHub 用户名
 * @param queryPath - GraphQL 查询文件路径
 * @param options - GitHub 客户端选项（token 等）
 * @returns PR 节点数组
 *
 * 分页逻辑：
 * 同 fetchAllRepos，使用 pageInfo.hasNextPage 和 endCursor 进行分页。
 *
 * 设计理念：
 * - 拉取所有 PR（不区分 open/closed/merged），便于后续分析
 * - PR 数据用于计算 UOI、活跃时段、外部 PR 合并率等指标
 * - 如果用户不存在，抛出 GitHubNotFoundError
 */
async function fetchAllPRs(
  login: string,
  queryPath: string,
  options: GitHubClientOptions,
): Promise<PRNode[]> {
  const all: PRNode[] = [];
  let after: string | null = null;

  // 分页拉取所有 PR
  while (true) {
    const data: PRsConnection = await graphqlFromFile<PRsConnection>(
      queryPath,
      { login, after },
      options,
    );

    if (!data.user) {
      throw new GitHubNotFoundError(`GitHub user '${login}' not found or inaccessible`, data);
    }

    const conn = data.user.pullRequests;

    if (conn.nodes && conn.nodes.length > 0) {
      all.push(...conn.nodes);
    }

    if (!conn.pageInfo.hasNextPage) break;
    after = conn.pageInfo.endCursor;
  }

  return all;
}

/**
 * 拉取用户的 Profile README
 *
 * 尝试拉取用户的 Profile README（位于 <username>/<username> 仓库的 README.md）。
 *
 * @param login - GitHub 用户名
 * @param options - GitHub 客户端选项（token 等）
 * @returns Profile README 的 Markdown 内容，如果不存在或为空则返回 null
 *
 * 处理逻辑：
 * 1. 查询 <username>/<username> 仓库的 README.md
 * 2. 如果仓库不存在或为私有，返回 null
 * 3. 如果 README.md 不存在或为空，返回 null
 * 4. 如果查询失败（如网络错误），打印警告并返回 null（不中断扫描）
 *
 * 设计理念：
 * - Profile README 是可选的，不应该因为拉取失败而中断整个扫描
 * - 使用 try-catch 捕获错误，确保扫描流程的健壮性
 * - Profile README 用于分析用户的自我介绍风格（参考 analyze.ts）
 */
async function fetchProfileReadme(
  login: string,
  options: GitHubClientOptions,
): Promise<string | null> {
  try {
    const data: ProfileReadmeQuery = await graphqlFromFile<ProfileReadmeQuery>(
      profileReadmeQueryPath,
      { login },
      options,
    );

    const repo = data.repository;
    if (!repo || repo.isPrivate) {
      return null;
    }

    const obj = repo.object;
    const text = obj && typeof obj.text === "string" ? obj.text : null;
    if (text && text.trim().length > 0) {
      return text;
    }

    return null;
  } catch (error) {
    const message = (error as Error)?.message ?? String(error);
    console.warn(`[devhunt] Warning: failed to fetch profile README for ${login}: ${message}`);
    return null;
  }
}

/**
 * 拉取用户的 GitHub 内部 ID
 *
 * 获取用户的 GitHub 内部 ID（用于 commit 查询的 author 过滤）。
 *
 * @param login - GitHub 用户名
 * @param options - GitHub 客户端选项（token 等）
 * @returns 用户的 GitHub 内部 ID（如 "MDQ6VXNlcjEyMzQ1Njc="）
 *
 * 设计理念：
 * - GitHub GraphQL API 的 commit 查询需要使用内部 ID 作为 author 过滤条件
 * - 内部 ID 是 Base64 编码的字符串，不同于用户名
 * - 如果用户不存在，抛出 GitHubNotFoundError
 */
async function fetchUserId(login: string, options: GitHubClientOptions): Promise<string> {
  const data: UserIdResult = await graphqlFromFile<UserIdResult>(userIdQueryPath, { login }, options);

  if (!data.user) {
    throw new GitHubNotFoundError(`GitHub user '${login}' not found or inaccessible`, data);
  }

  return data.user.id;
}

/**
 * 拉取用户的贡献统计
 *
 * 使用 GraphQL 查询获取用户的贡献统计数据（commits、PRs、issues、reviews 等）。
 *
 * @param login - GitHub 用户名
 * @param from - 统计开始时间（ISO 8601 格式，null 表示默认为一年前）
 * @param to - 统计结束时间（ISO 8601 格式，null 表示默认为当前时间）
 * @param options - GitHub 客户端选项（token 等）
 * @returns 贡献统计数据
 *
 * 设计理念：
 * - 获取完整的贡献热力图数据（contributionCalendar）
 * - 统计 Issue/PR/Review 贡献数量
 * - 可视化活跃度趋势
 * - 支持自定义时间范围（默认为最近一年）
 * - 如果用户不存在，抛出 GitHubNotFoundError
 *
 * 注意：
 * - contributionsCollection 不是分页接口，一次查询返回完整数据
 * - 时间范围建议不超过一年，避免数据量过大
 * - restrictedContributionsCount 只有在用户启用私有贡献计数时才非零
 */
async function fetchContributionsCollection(
  login: string,
  from: string | null,
  to: string | null,
  options: GitHubClientOptions,
): Promise<ContributionsCollectionNode> {
  const data: ContributionsCollectionResult = await graphqlFromFile<ContributionsCollectionResult>(
    contributionsQueryPath,
    { login, from, to },
    options,
  );

  if (!data.user) {
    throw new GitHubNotFoundError(`GitHub user '${login}' not found or inaccessible`, data);
  }

  return data.user.contributionsCollection;
}

/**
 * 拉取所有仓库的 commit 历史
 *
 * 遍历所有仓库，拉取用户在每个仓库的 commit 历史。
 *
 * @param login - GitHub 用户名
 * @param authorId - 用户的 GitHub 内部 ID（用于过滤 commit）
 * @param repos - 仓库列表
 * @param since - Commit 拉取的起始时间（ISO 8601 格式，null 表示不限制）
 * @param options - GitHub 客户端选项（token 等）
 * @returns 所有仓库的 commit 记录数组
 *
 * 设计理念：
 * - 串行拉取每个仓库的 commit（避免并发请求过多导致 rate limit）
 * - 使用 authorId 过滤，只拉取用户自己的 commit
 * - 支持时间窗口参数（since），限制拉取范围
 * - 空仓库（无 commit）不会影响整体流程
 */
async function fetchAllCommits(
  login: string,
  authorId: string,
  repos: RepoNode[],
  since: string | null,
  options: GitHubClientOptions,
): Promise<CommitRecord[]> {
  const all: CommitRecord[] = [];

  // 串行拉取每个仓库的 commit
  for (const repo of repos) {
    const repoCommits = await fetchCommitsForRepo(login, authorId, repo, since, options);
    if (repoCommits.length > 0) {
      all.push(...repoCommits);
    }
  }

  return all;
}

/**
 * 拉取单个仓库的 commit 历史
 *
 * 使用 GraphQL 分页机制，拉取指定仓库的 default branch 上的所有 commit。
 *
 * @param login - GitHub 用户名
 * @param authorId - 用户的 GitHub 内部 ID（用于过滤 commit）
 * @param repo - 仓库节点
 * @param since - Commit 拉取的起始时间（ISO 8601 格式，null 表示不限制）
 * @param options - GitHub 客户端选项（token 等）
 * @returns 该仓库的 commit 记录数组
 *
 * 分页逻辑：
 * 同 fetchAllRepos，使用 pageInfo.hasNextPage 和 endCursor 进行分页。
 *
 * 处理逻辑：
 * 1. 查询 repository.defaultBranchRef.target.history
 * 2. 使用 authorId 过滤，只拉取用户自己的 commit
 * 3. 如果仓库没有 default branch（如空仓库），直接返回空数组
 * 4. 将每个 commit 节点转换为 CommitRecord 格式
 *
 * 设计理念：
 * - 只拉取 default branch 的 commit（MVP 版本，参考 mvp.md）
 * - 使用 authorId 过滤，避免拉取其他贡献者的 commit
 * - 支持时间窗口参数（since），限制拉取范围
 */
async function fetchCommitsForRepo(
  login: string,
  authorId: string,
  repo: RepoNode,
  since: string | null,
  options: GitHubClientOptions,
): Promise<CommitRecord[]> {
  const all: CommitRecord[] = [];
  let after: string | null = null;
  const ownerLogin = repo.owner.login;

  // 分页拉取该仓库的 commit
  while (true) {
    const data: RepoCommitsConnection = await graphqlFromFile<RepoCommitsConnection>(
      repoCommitsQueryPath,
      { owner: ownerLogin, name: repo.name, authorId, since, after },
      options,
    );

    const repository = data.repository;
    const defaultBranch = repository?.defaultBranchRef;
    const target = defaultBranch?.target;

    // 如果仓库没有 default branch，直接返回
    if (!repository || !defaultBranch || !target) {
      break;
    }

    const history = target.history;

    if (history.nodes && history.nodes.length > 0) {
      for (const node of history.nodes) {
        all.push(toCommitRecord(login, repository, node));
      }
    }

    if (!history.pageInfo.hasNextPage) break;
    after = history.pageInfo.endCursor;
  }

  return all;
}

/**
 * 将 GraphQL commit 节点转换为 CommitRecord 格式
 *
 * 这是数据转换函数，将 GitHub GraphQL API 返回的 commit 节点转换为
 * devhunt 的 CommitRecord 格式（用于写入 commits.jsonl）。
 *
 * @param login - GitHub 用户名（用于判断是否为自有仓库）
 * @param repository - 仓库信息
 * @param node - Commit 节点
 * @returns CommitRecord 对象
 *
 * 数据增强：
 * 1. 添加 isOwn 字段（是否为用户自有仓库）
 * 2. 解析作者邮箱，提取 emailDomain 和 emailTld
 * 3. 提取关联的 PR 信息（含母仓详情）
 * 4. 标记 isMerge（是否为 merge commit）
 *
 * 设计理念：
 * - 将原始 GraphQL 数据转换为更易于分析的格式
 * - 添加派生字段（如 isOwn、emailTld），避免后续重复计算
 * - 保留完整的 PR 信息，便于分析 commit 的上下文
 *
 * 参考文档：CHANGELOG.md v0.0.4 中的 commits.jsonl 格式
 */
function toCommitRecord(login: string, repository: RepoCommitsConnection["repository"], node: CommitNode): CommitRecord {
  const ownerLogin = repository?.owner.login ?? "";
  const repoName = repository?.name ?? "";
  const isOwn = ownerLogin.toLowerCase() === login.toLowerCase();

  // 提取作者信息
  const authorLogin = node.author?.user?.login ?? null;
  const authorName = node.author?.name ?? null;
  const authorEmail = node.author?.email ?? null;

  // 解析邮箱域名和 TLD
  const { emailDomain, emailTld } = parseEmailInfo(authorEmail);

  // 提取关联的 PR 信息
  const associatedPRs = node.associatedPullRequests?.nodes?.map((pr) => {
    const baseRepo = pr.baseRepository
      ? {
          owner: pr.baseRepository.owner.login,
          name: pr.baseRepository.name,
          stargazerCount: pr.baseRepository.stargazerCount,
          totalPrCount: pr.baseRepository.pullRequests.totalCount ?? null,
          defaultBranch: pr.baseRepository.defaultBranchRef?.name ?? null,
        }
      : null;

    const headRepo = pr.headRepository
      ? {
          owner: pr.headRepository.owner.login,
          name: pr.headRepository.name,
          stargazerCount: pr.headRepository.stargazerCount,
          totalPrCount: null,
          isFork: pr.headRepository.isFork,
        }
      : null;

    const isMerged = pr.state === "MERGED" || pr.mergedAt != null;

    return {
      number: pr.number,
      url: pr.url,
      state: pr.state,
      isMerged,
      baseRef: pr.baseRefName,
      headRef: pr.headRefName,
      isCrossRepository: pr.isCrossRepository,
      createdAt: pr.createdAt,
      mergedAt: pr.mergedAt,
      closedAt: pr.closedAt,
      baseRepo,
      headRepo,
    };
  });

  return {
    repo: {
      owner: ownerLogin,
      name: repoName,
      isOwn,
    },
    sha: node.oid,
    authoredAt: node.authoredDate,
    committedAt: node.committedDate,
    messageHeadline: node.messageHeadline,
    messageBody: node.messageBody,
    isMerge: node.parents.totalCount > 1,
    stats: {
      additions: node.additions,
      deletions: node.deletions,
      changedFiles: node.changedFiles,
    },
    author: {
      login: authorLogin,
      name: authorName,
      email: authorEmail,
      emailDomain,
      emailTld,
    },
    associatedPRs: associatedPRs ?? [],
  };
}

