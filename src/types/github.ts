/**
 * GitHub 仓库与 PR 记录类型。
 *
 * 这些类型在 scan 阶段从 GitHub GraphQL API 取数后落盘，
 * 在 analysis 阶段作为纯数据输入参与各类指标计算。
 */
export interface RepoRecord {
  /** 仓库名 */
  name: string;
  /** 是否为 fork 仓库 */
  isFork: boolean;
  /** 是否已归档 */
  isArchived: boolean;
  /** 主语言（primaryLanguage.name） */
  primaryLanguage: { name: string } | null;
  /** star 数 */
  stargazerCount: number;
  /** fork 数 */
  forkCount: number;
  /** watcher 总数（可选） */
  watchers?: { totalCount: number } | null;
  /** 许可证信息（SPDX ID，可选） */
  licenseInfo?: { spdxId: string | null } | null;
  /** 创建时间 */
  createdAt: string;
  /** 最近 push 时间（可能为 null） */
  pushedAt: string | null;
  /** 所有者登录名 */
  owner: { login: string };
  /** 仓库描述（v0.0.9 新增） */
  description?: string | null;
  /** 仓库主题标签（用于 topics 画像，v0.0.9 新增） */
  repositoryTopics?: {
    nodes: { topic: { name: string } }[];
  };
  /** 语言统计（bytes 级，v0.0.9 新增） */
  languages?: {
    edges: { size: number; node: { name: string } }[];
  } | null;
}

/**
 * Pull Request 记录接口。
 *
 * 对应 scan 阶段从 GitHub GraphQL API 拉取的 PR 数据。
 */
export interface PRRecord {
  /** 创建时间 */
  createdAt: string;
  /** 合并时间（未合并则为 null） */
  mergedAt: string | null;
  /** 关闭时间（未关闭则为 null） */
  closedAt: string | null;
  /** 是否跨仓库 PR（外部贡献） */
  isCrossRepository: boolean;
  /** diff additions */
  additions: number;
  /** diff deletions */
  deletions: number;
  /** 变更文件数 */
  changedFiles: number;
  /** 目标仓库信息 */
  repository: { name: string; owner: { login: string } };
  /** PR 链接 */
  url: string;
}

/**
 * 用户基本信息（高可信度字段）。
 *
 * v0.0.10 起从 scan.ts 导入，用于丰富画像和做 README 一致性检查。
 */
export interface UserInfo {
  /** GitHub 用户名 */
  login: string;
  /** 用户简介 */
  bio: string | null;
  /** 公司 / 组织 */
  company: string | null;
  /** 地理位置 */
  location: string | null;
  /** 个人网站 URL */
  websiteUrl: string | null;
  /** Twitter 用户名 */
  twitterUsername: string | null;
  /** 关注者数量 */
  followers: number;
  /** 关注数量 */
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
 * Commit 记录（输出到 commits.jsonl 的格式）。
 *
 * 这是经过处理和增强的 commit 数据，包含：
 * - 仓库信息（含是否为自有仓库的标记）
 * - Commit 基本信息（SHA、时间、消息）
 * - 代码变更统计
 * - 作者信息（含邮箱域名和 TLD 分类）
 * - 关联的 PR 信息（含母仓详情）
 */
export interface CommitRecord {
  /** 仓库信息 */
  repo: {
    owner: string;
    name: string;
    /** 是否为用户自有仓库 */
    isOwn: boolean;
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

