import type { RepoRecord, PRRecord, UserInfo, CommitRecord } from "./github";

/**
 * Profile README 风格分类。
 */
export type ProfileReadmeStyle =
  | "none" // 没有 Profile README
  | "empty" // 文件存在但为空
  | "one_liner" // 单行简介（≤140 字符，无图片）
  | "short_bio" // 短文本简介（多行文本，无图片）
  | "visual_dashboard" // 视觉仪表盘（图片数量 ≥ 文本行数）
  | "mixed"; // 文本 + 图片混合

/**
 * Profile README 分析结果。
 */
export interface ProfileReadmeAnalysis {
  /** README 风格分类 */
  style: ProfileReadmeStyle;
  /** 原始 Markdown 内容（如果存在） */
  markdown: string | null;
  /** 去除 Markdown 格式后的完整纯文本 */
  plain_text: string | null;
  /** 提取的文本摘要（前 400 字符） */
  text_excerpt: string | null;
  /** 图片的 alt 文本列表 */
  image_alt_texts: string[];
}

/**
 * Profile README 与行为数据的一致性信号。
 *
 * 对齐 pod.md 中的“第 3 层：一致性/真实性信号（consistency）”。
 */
export interface ConsistencySignals {
  /** README 中自述的语言列表（从文本和图片 alt 文本中提取） */
  readme_languages: string[];
  /** 行为指标中出现的主语言列表（对应 skills.lang） */
  metric_languages: string[];
  /** 同时出现在自述和行为中的语言列表 */
  language_overlap: string[];
  /** 自述语言中被行为数据佐证的比例（0-1），无自述语言时为 null */
  readme_language_supported_ratio: number | null;
  /** README vs skills 的粗粒度一致性等级 */
  readme_vs_skills_consistency: "strong" | "partial" | "poor" | "unknown";
  /** README 中提到的自有仓库（owner/repo，全部小写） */
  owned_repos_mentioned: string[];
  /** 出现在 repos 数据中的自有仓库（owner/repo，全部小写） */
  owned_repos_found_in_data: string[];
  /** README 提到但在仓库列表中未找到的自有仓库 */
  owned_repos_missing_in_data: string[];
  /** README 中提到的技术栈/主题（v0.0.9） */
  readme_topics: string[];
  /** 行为数据中的 topics（从 repositoryTopics 中提取，小写，v0.0.9） */
  metric_topics: string[];
  /** 同时出现在自述和行为中的 topics（v0.0.9） */
  topic_overlap: string[];
}

/**
 * 开发者画像 JSON 结构（profile.json）。
 */
export interface ProfileJSON {
  /** GitHub 用户名 */
  login: string;

  // v0.0.10: 用户基本信息（高可信度字段）
  bio: string | null;
  company: string | null;
  location: string | null;
  websiteUrl: string | null;
  twitterUsername: string | null;
  followers: number;
  following: number;
  organizations: {
    login: string;
    name: string | null;
    description: string | null;
    websiteUrl: string | null;
  }[];

  /** 时区信息（自动推断 / 用户覆盖 / 实际使用） */
  timezone: { auto: string | null; override: string | null; used: string | null };
  /** 技能画像（语言 + 权重） */
  skills: { lang: string; weight: number }[];
  /** 核心活跃时段（Top 2 小时段）。无 PR 数据时为空数组。 */
  core_hours: { start: string; end: string }[];
  /** 上游倾向指数（0-1，无 PR 时为 null） */
  uoi: number | null;
  /** UOI 指标的样本量（参与计算的 PR 总数） */
  uoi_sample_size: number;
  /** 外部 PR 合并率（0-1，无外部 PR 时为 null） */
  external_pr_accept_rate: number | null;
  /** 外部 PR 合并率的样本量（外部 PR 总数） */
  external_pr_sample_size: number;
  /** Uni Index（协作光谱 v0）：基于自有 commit + PR vs 外部 PR 的 Creator/Collaborator 指数 */
  uni_index: {
    /** Uni Index 数值（0-1，无样本或分母为 0 时为 null） */
    value: number | null;
    /** 参与计算的原始事件数量（commits + prs，或其他活动总和） */
    sample_size: number;
    /** 是否将组织仓库视为“自有仓库”纳入 owned 侧 */
    include_org_repos: boolean;
  };
  /** Night Ratio（熬夜率）：基于 commit.authoredAt 的夜间 commit 占比，排除 merge commit。无有效样本时为 null。 */
  night_ratio: number | null;
  /** Night Ratio 指标的样本量（参与计算的 commit 数量，排除 merge 和无效时间） */
  night_ratio_sample_size: number;
  /** Focus Ratio（专注率）：按语言 Bytes 聚合后，Top1 语言字节占比（0-1）。无语言字节数据时为 null。 */
  focus_ratio: number | null;
  /** Focus Ratio 的样本量（参与计算的总 bytes，作为样本量刻度） */
  focus_ratio_sample_size: number;
  /** 证据样本（用于 AI 生成具体案例） */
  summary_evidence: { sample_prs: string[]; sample_repos: string[] };
  /** Profile README 分析 */
  readme: ProfileReadmeAnalysis;
  /** README 自述 vs 行为数据的一致性信号 */
  consistency: ConsistencySignals;
  /** 数据覆盖范围元信息（v0.0.11） */
  data_coverage: {
    /** 仓库总数（参与分析的自有仓库数量） */
    repos_total: number;
    /** PR 总数（参与分析的 PR 数量） */
    prs_total: number;
    /** PR 时间范围：最早/最晚 createdAt，可能为 null */
    prs_time_range: { first: string | null; last: string | null };
    /** 仓库时间范围：最早创建和最近 push 时间，可能为 null */
    repos_time_range: { first_created_at: string | null; last_pushed_at: string | null };
  };
}

/** 分析结果：画像 + 中间结果。 */
export interface AnalysisResult {
  /** 开发者画像（输出到 profile.json） */
  profile: ProfileJSON;
  /** 24 小时活跃直方图（用于生成 hours.svg） */
  hoursHistogram: (number | null)[]; // length 24
}

/** analyzeAll 的输入选项。 */
export interface AnalyzeOptions {
  /** GitHub 用户名 */
  login: string;
  /** 仓库列表 */
  repos: RepoRecord[];
  /** PR 列表 */
  prs: PRRecord[];
  /** Commit 列表（来自 commits.jsonl，可能为空或未提供） */
  commits?: CommitRecord[];
  /** 时区覆盖参数（用于本地化时间分析） */
  tzOverride?: string | null;
  /** Profile README 的 Markdown 内容 */
  profileReadmeMarkdown?: string | null;
  /** 用户基本信息（v0.0.10 新增） */
  userInfo?: UserInfo | null;
}

