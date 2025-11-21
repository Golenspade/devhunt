import type { RepoRecord, PRRecord, UserInfo, CommitRecord, ContributionsSummary } from "./github";

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
  avatarUrl: string | null;
  followers: number;
  following: number;
  organizations: {
    login: string;
    name: string | null;
    description: string | null;
    websiteUrl: string | null;
  }[];

  /** 标签系统（基于 Fork Destiny + Community Engagement 等指标推导出的 archetypes） */
  tags: string[];

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

  /**
   * Grit Factor v2（有效交付率）：原创自有仓库中，达到“长期维护”或“有效交付（有 Star 的短平快 MVP）”状态的比例。
   *
   * 定义（v0 实现）：
   * - 分母 sample_size：所有满足 owner=login 且 isFork=false 的仓库数量（原创自有仓库总数）。
   * - 长期维护（long_term_count）：生命周期（pushedAt - createdAt）≥ 90 天的原创自有仓库数量，Star 数不限。
   * - 有效交付（gem_count）：生命周期 < 90 天且 stargazerCount ≥ 5 的原创自有仓库数量（短平快但“有人用”的小工具/MVP）。
   * - 噪音/烂尾（churn_count）：其余未满足长期/有效交付条件的原创自有仓库数量（test/demo/尝试后放弃的项目）。
   * - value = (long_term_count + gem_count) / sample_size；当 sample_size=0（没有任何原创自有仓库）时为 null。
   */
  grit_factor: {
    /** 有效交付率（0-1）。当 sample_size 为 0（没有任何原创自有仓库）时为 null。 */
    value: number | null;
    /** 分母：参与计算的原创自有仓库数量（owner=login 且 isFork=false）。 */
    sample_size: number;
    /** 生命周期 ≥ 90 天（pushedAt - createdAt）的原创自有仓库数量，Star 数不限。 */
    long_term_count: number;
    /** 生命周期 < 90 天且 stargazerCount ≥ 5 的原创自有仓库数量（短平快但完成 MVP 交付）。 */
    gem_count: number;
    /** 未满足长期维护或有效交付条件的原创自有仓库数量（test/demo/烂尾等）。 */
    churn_count: number;
  };

  /**
   * Fork Destiny（分歧指数 v0）：基于自有 fork 的“宿命”分布。
   *
   * - total_forks: 自有 fork 仓库总数（owner = login 且 isFork=true）
   * - contributor_forks: 至少有一条向上游仓库（不同 owner）发起并被合并的 PR 的 fork 数量
   * - variant_forks: 未被上游合并，但 star 绝对值或相对母仓占比较高的 fork 数量
   * - noise_forks: 既没有被上游合并，也没有明显 star 的 fork 数量
   */
  fork_destiny: {
    total_forks: number;
    contributor_forks: number;
    variant_forks: number;
    noise_forks: number;
    total_fork_stars: number;
    variant_fork_stars: number;
  };

  /**
   * Community Engagement（社区卷入度 v0）。
   *
   * - talk_events = issues + PR reviews
   * - code_events = commits + PRs + repo contributions
   * - value = talk_events / (talk_events + code_events)，无样本时为 null
   */
  community_engagement: {
    /** talk 侧事件数量（issue + PR review） */
    talk_events: number;
    /** code 侧事件数量（commit + PR + repo contribution） */
    code_events: number;
    /** 归一化后的 Talk vs Code 比例（0-1，偏大说明更“会说话”/triage，多社区互动） */
    value: number | null;
    /** 总样本量（talk_events + code_events） */
    sample_size: number;
  };

  /**
   * Contribution Momentum（贡献动量 / 活跃加速度 v0）。
   *
   * 目的：
   * - 在 Grit Factor 描述“长期可靠性”的基础上，引入“最近是否在加速 / 冷却”的时间向量；
   * - 对齐「廉颇老矣，尚能饭否」这一类判断：近期是否还有实质贡献。
   *
   * 定义（基于 contributions.contributionCalendar）：
   * - year_total：过去一整年（日历）中所有 contribution 的总和；
   * - recent_quarter_total：最近约 1 个季度（最近 12 周）中的贡献总和；
   * - baseline_quarter = year_total / 4；
   * - value = recent_quarter_total / baseline_quarter；
   *
   * 状态分档（status）：
   * - "accelerating"：value > 1.5，最近 1 季度明显高于过去一年的平均节奏（爆发 / 冲刺期）；
   * - "cooling_down"：value < 0.5，最近 1 季度明显低于过去一年的平均节奏（冷却 / 退坑）；
   * - "steady"：0.8 <= value <= 1.2，节奏基本平稳（健康的长期输出）；
   * - "ghost"：value < 0.1 或 year_total = 0，基本无活跃（可视为“诈尸/弃号”）；
   * - "unknown"：缺少 contributions 数据或无法计算基准时（例如 contributionCalendar 缺失）。
   */
  contribution_momentum: {
    /** 最近约 1 季度的贡献动量，相对过去一年的基准（>1 加速，<1 降速），无法计算时为 null。 */
    value: number | null;
    /** 最近约 1 季度（最近 12 周）中的 contribution 总数。 */
    recent_quarter_total: number;
    /** 过去一整年日历中的 contribution 总数（来自 contributionCalendar）。 */
    year_total: number;
    /** 按区间划分的状态标签：accelerating / steady / cooling_down / ghost / unknown。 */
    status: "accelerating" | "steady" | "cooling_down" | "ghost" | "unknown";
  };

  /** 证据样本（用于 AI 生成具体案例） */
  summary_evidence: { sample_prs: string[]; sample_repos: string[] };
  /** GitHub 贡献汇总（contributions.json）；用于 talk vs code 等指标 */
  contributions?: ContributionsSummary | null;

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
  /** GitHub 贡献汇总（contributions.json）；用于 talk vs code 等指标 */
  contributions?: ContributionsSummary | null;
  /** 时区覆盖参数（用于本地化时间分析） */
  tzOverride?: string | null;
  /** Profile README 的 Markdown 内容 */
  profileReadmeMarkdown?: string | null;
  /** 用户基本信息（v0.0.10 新增） */
  userInfo?: UserInfo | null;
}

