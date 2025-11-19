/**
 * 分析模块
 *
 * 负责计算开发者画像的核心指标，包括：
 * - 语言画像（Skills）：基于仓库语言和 star 数的加权统计
 * - 活跃时段（Hours）：基于 PR 创建时间的 24 小时分布
 * - 上游倾向（UOI）：外部贡献 vs 自有仓库的比例
 * - 外部 PR 合并率：协作质量的简单度量
 * - 代表作（Top Repos）：基于 star 数和活跃度的仓库排名
 *
 * 参考文档：
 * - mvp.md 中的指标定义（A/B/C/D/E 五类指标）
 * - pod.md 中的多镜头分析理念（dev/成长/行为代理）
 */

/**
 * 仓库记录接口
 *
 * 对应 scan 阶段从 GitHub GraphQL API 拉取的仓库数据。
 *
 * v0.0.9 新增字段：
 * - description: 仓库描述
 * - repositoryTopics: 仓库主题标签（用于技术栈识别）
 * - languages: 所有语言统计（而不仅仅是 primaryLanguage）
 */
export interface RepoRecord {
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
  description?: string | null;
  repositoryTopics?: {
    nodes: { topic: { name: string } }[];
  };
  languages?: {
    edges: { size: number; node: { name: string } }[];
  } | null;
}

/**
 * Pull Request 记录接口
 *
 * 对应 scan 阶段从 GitHub GraphQL API 拉取的 PR 数据。
 */
export interface PRRecord {
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
 * Profile README 风格分类
 *
 * 用于识别开发者的 GitHub Profile README 类型。
 *
 * - "none": 没有 Profile README
 * - "empty": 文件存在但为空
 * - "one_liner": 单行简介（≤140 字符，无图片）
 * - "short_bio": 短文本简介（多行文本，无图片）
 * - "visual_dashboard": 视觉仪表盘（图片数量 ≥ 文本行数）
 * - "mixed": 混合风格（文本 + 图片）
 */
export type ProfileReadmeStyle =
  | "none"
  | "empty"
  | "one_liner"
  | "short_bio"
  | "visual_dashboard"
  | "mixed";

/**
 * Profile README 分析结果
 *
 * 包含 README 的风格分类、原始 Markdown、提取的纯文本和图片信息。
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
 * Profile README 与行为数据的一致性信号
 *
 * 对齐 pod.md 中的“第 3 层：一致性/真实性信号（consistency）”：
 * - 比较 README 自述的语言/仓库 和 repos/skills 等行为数据
 * - 不直接给“真/假”结论，只给“佐证强弱”和可回溯的证据字段
 *
 * v0.0.9 新增：
 * - readme_topics: README 中提到的技术栈/主题（从 topics 数据中提取）
 * - metric_topics: 行为数据中的 topics（从 repositoryTopics 中提取）
 * - topic_overlap: 同时出现在自述和行为中的 topics
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
  /** README 中提到的自有仓库（owner/repo 格式，全部小写） */
  owned_repos_mentioned: string[];
  /** 出现在 repos 数据中的自有仓库（owner/repo 格式，全部小写） */
  owned_repos_found_in_data: string[];
  /** README 提到但在仓库列表中未找到的自有仓库（可能是私有仓库或访问受限） */
  owned_repos_missing_in_data: string[];
  /** v0.0.9: README 中提到的技术栈/主题（从文本中提取，小写） */
  readme_topics: string[];
  /** v0.0.9: 行为数据中的 topics（从 repositoryTopics 中提取，小写） */
  metric_topics: string[];
  /** v0.0.9: 同时出现在自述和行为中的 topics */
  topic_overlap: string[];
}

/**
 * 开发者画像 JSON 结构
 *
 * 这是输出给 AI 的核心数据结构（profile.json）。
 *
 * 设计理念（参考 pod.md）：
 * - 只给事实和证据，不做价值判断
 * - 所有结论都可回溯到原始数据（repos/PRs）
 * - 结构化数据便于 AI 生成"结论/分析/亮点/总评"
 *
 * v0.0.10: 新增用户基本信息字段（bio/company/location/websiteUrl/twitterUsername/followers/following/organizations）
 */
export interface ProfileJSON {
  /** GitHub 用户名 */
  login: string;

  // v0.0.10: 用户基本信息（高可信度字段）
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

  /** 时区信息（自动推断 / 用户覆盖 / 实际使用） */
  timezone: { auto: string | null; override: string | null; used: string | null };
  /** 技能画像（语言 + 权重） */
  skills: { lang: string; weight: number }[];
  /**
   * 核心活跃时段（Top 2 小时段）。
   *
   * 当没有 PR 数据时，为空数组（表示“未知”而不是“确实没有活跃时段”）。
   */
  core_hours: { start: string; end: string }[];
  /**
   * 上游倾向指数（Upstream Orientation Index，0-1）。
   *
   * 当没有任何 PR 数据时为 null，表示“未知”。
   */
  uoi: number | null;
  /** UOI 指标的样本量（参与计算的 PR 总数） */
  uoi_sample_size: number;
  /**
   * 外部 PR 合并率（0-1）。
   *
   * 当没有外部 PR 时为 null，表示“未知”。
   */
  external_pr_accept_rate: number | null;
  /** 外部 PR 合并率的样本量（外部 PR 总数） */
  external_pr_sample_size: number;
  /** 证据样本（用于 AI 生成具体案例） */
  summary_evidence: { sample_prs: string[]; sample_repos: string[] };
  /** Profile README 分析 */
  readme: ProfileReadmeAnalysis;
  /** README 自述 vs 行为数据的一致性信号 */
  consistency: ConsistencySignals;
  /**
   * 数据覆盖范围元信息（v0.0.11）。
   *
   * 主要用于帮助下游消费者判断“样本有多大 / 时间跨度有多长”，
   * 避免把本质上的 "no data" 误读成 0。
   */
  data_coverage: {
    /** 仓库总数（参与分析的自有仓库数量） */
    repos_total: number;
    /** PR 总数（参与分析的 PR 数量） */
    prs_total: number;
    /** PR 时间范围：最早/最晚 createdAt，可能为 null（无 PR 时） */
    prs_time_range: { first: string | null; last: string | null };
    /** 仓库时间范围：最早创建和最近 push 时间，可能为 null（无仓库时） */
    repos_time_range: { first_created_at: string | null; last_pushed_at: string | null };
  };
}

/**
 * 分析结果
 *
 * 包含完整的画像数据和中间计算结果。
 */
export interface AnalysisResult {
  /** 开发者画像（输出到 profile.json） */
  profile: ProfileJSON;
  /** 24 小时活跃直方图（用于生成 hours.svg） */
  hoursHistogram: (number | null)[]; // length 24
}

/**
 * 分析选项
 *
 * 传递给 analyzeAll 函数的参数。
 *
 * v0.0.10: 新增 userInfo 参数
 */
export interface AnalyzeOptions {
  /** GitHub 用户名 */
  login: string;
  /** 仓库列表 */
  repos: RepoRecord[];
  /** PR 列表 */
  prs: PRRecord[];
  /** 时区覆盖参数（用于本地化时间分析） */
  tzOverride?: string | null;
  /** Profile README 的 Markdown 内容 */
  profileReadmeMarkdown?: string | null;
  /** 用户基本信息（v0.0.10 新增） */
  userInfo?: UserInfo | null;
}

/**
 * 用户基本信息
 *
 * v0.0.10: 从 scan.ts 导入的用户信息类型
 *
 * 这些字段具有高可信度（直接来自 GitHub 用户设置）。
 */
export interface UserInfo {
  login: string;
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
}

/**
 * 执行完整的开发者画像分析
 *
 * 这是分析模块的主入口函数，协调所有子指标的计算。
 *
 * @param options - 分析选项（包含用户名、repos、PRs 等）
 * @returns 包含画像数据和中间结果的 AnalysisResult 对象
 *
 * 执行流程：
 * 1. 计算语言权重（基于 repos 的 primaryLanguage 和 stars）
 * 2. 解析时区偏移量（从 tzOverride 参数）
 * 3. 计算 24 小时活跃直方图（基于 PRs 的 createdAt）
 * 4. 提取核心活跃时段（Top 2 小时段）
 * 5. 计算上游倾向指数（UOI）
 * 6. 计算外部 PR 合并率
 * 7. 构建时区信息对象
 * 8. 提取证据样本（sample PRs 和 repos）
 * 9. 分析 Profile README
 *
 * 设计理念：
 * - 所有计算都是纯函数，便于测试和理解
 * - 中间结果（如 hoursHistogram）也返回，用于生成图表
 * - 不做副作用（如文件 I/O），只做数据转换
 */
export function analyzeAll(options: AnalyzeOptions): AnalysisResult {
  const { login, repos, prs, tzOverride, profileReadmeMarkdown, userInfo } = options;

  // 计算各项指标
  const langWeights = computeLanguageWeights(repos);
  const tzOffsetMinutes = parseTimezoneOffset(tzOverride);
  const hoursHistogram = computeHoursHistogram(prs, tzOffsetMinutes);
  const coreHours = computeCoreHours(hoursHistogram);
  const uoi = computeUoi(prs, login);
  const externalRate = computeExternalPrAcceptRate(prs, login);
  const timezone = buildTimezone(tzOverride, tzOffsetMinutes);
  const summary = buildSummaryEvidence(login, repos, prs);
  const readme = analyzeProfileReadme(profileReadmeMarkdown ?? null);
  const consistency = computeReadmeConsistency(readme, langWeights, login, repos);

  // 数据覆盖元信息与样本量（避免将 "no data" 误读为 0）
  const reposTotal = repos.length;
  const prsTotal = prs.length;

  // PR 时间范围（按 createdAt）
  let firstPr: string | null = null;
  let lastPr: string | null = null;
  if (prsTotal > 0) {
    const first = prs[0]!;
    let min = first.createdAt;
    let max = first.createdAt;
    for (const pr of prs) {
      if (pr.createdAt < min) min = pr.createdAt;
      if (pr.createdAt > max) max = pr.createdAt;
    }
    firstPr = min;
    lastPr = max;
  }

  // 仓库时间范围（最早创建和最近 push）
  let firstCreatedAt: string | null = null;
  let lastPushedAt: string | null = null;
  if (reposTotal > 0) {
    const firstRepo = repos[0]!;
    let minCreated = firstRepo.createdAt;
    // pushedAt 允许为 null：如果整个用户从未 push 过（理论上很罕见），lastPushedAt 保持为 null
    let maxPushed = firstRepo.pushedAt;
    for (const repo of repos) {
      if (repo.createdAt < minCreated) minCreated = repo.createdAt;
      if (repo.pushedAt && (!maxPushed || repo.pushedAt > maxPushed)) {
        maxPushed = repo.pushedAt;
      }
    }
    firstCreatedAt = minCreated;
    lastPushedAt = maxPushed ?? null;
  }

  // UOI / 外部 PR 合并率 的样本量
  const uoiSampleSize = prsTotal;
  let externalPrSampleSize = 0;
  const lowerLogin = login.toLowerCase();
  for (const pr of prs) {
    const owner = pr.repository.owner.login.toLowerCase();
    if (owner !== lowerLogin) externalPrSampleSize++;
  }

  return {
    profile: {
      login,
      // v0.0.10: 用户基本信息（如果提供）
      bio: userInfo?.bio ?? null,
      company: userInfo?.company ?? null,
      location: userInfo?.location ?? null,
      websiteUrl: userInfo?.websiteUrl ?? null,
      twitterUsername: userInfo?.twitterUsername ?? null,
      followers: userInfo?.followers ?? 0,
      following: userInfo?.following ?? 0,
      organizations: userInfo?.organizations ?? [],

      timezone,
      skills: langWeights,
      core_hours: coreHours,
      uoi,
      uoi_sample_size: uoiSampleSize,
      external_pr_accept_rate: externalRate,
      external_pr_sample_size: externalPrSampleSize,
      summary_evidence: summary,
      readme,
      consistency,
      data_coverage: {
        repos_total: reposTotal,
        prs_total: prsTotal,
        prs_time_range: { first: firstPr, last: lastPr },
        repos_time_range: {
          first_created_at: firstCreatedAt,
          last_pushed_at: lastPushedAt
        }
      }
    },
    hoursHistogram
  };
}

/**
 * 计算语言权重（Skills 指标）
 *
 * 基于仓库的主要语言和 star 数，计算开发者的语言技能分布。
 *
 * 算法（参考 mvp.md）：
 * 1. 对每个仓库，提取 primaryLanguage
 * 2. 计算权重：w = log(1 + stars)（对大仓更敏感）
 * 3. 按语言累加权重
 * 4. 归一化为 0-1 之间的比例
 * 5. 按权重降序排列
 *
 * @param repos - 仓库列表
 * @returns 语言权重数组（按权重降序）
 *
 * @example
 * ```typescript
 * const repos = [
 *   { primaryLanguage: { name: "TypeScript" }, stargazerCount: 820, ... },
 *   { primaryLanguage: { name: "Go" }, stargazerCount: 210, ... },
 *   { primaryLanguage: { name: "TypeScript" }, stargazerCount: 50, ... }
 * ];
 * computeLanguageWeights(repos);
 * // => [
 * //   { lang: "TypeScript", weight: 0.62 },
 * //   { lang: "Go", weight: 0.38 }
 * // ]
 * ```
 *
 * 设计理念：
 * - 使用 log(1+stars) 而非线性权重，避免单个高 star 仓库主导结果
 * - 归一化为比例，便于跨用户比较
 * - 忽略没有 primaryLanguage 的仓库（如纯文档仓库）
 */
export function computeLanguageWeights(repos: RepoRecord[]): { lang: string; weight: number }[] {
  const weights = new Map<string, number>();

  // 累加每种语言的权重
  for (const repo of repos) {
    const lang = repo.primaryLanguage?.name;
    if (!lang) continue;
    const stars = repo.stargazerCount ?? 0;
    const w = Math.log1p(stars);  // log(1 + stars)
    // v0.0.9 修复：允许 0 star 的仓库（使用最小权重 1）
    const weight = w > 0 ? w : 1;
    weights.set(lang, (weights.get(lang) ?? 0) + weight);
  }

  // 归一化为比例
  const entries = Array.from(weights.entries());
  const total = entries.reduce((sum, [, w]) => sum + w, 0) || 1;

  return entries
    .map(([lang, w]) => ({ lang, weight: w / total }))
    .sort((a, b) => b.weight - a.weight);
}

/**
 * 计算语言权重（基于完整语言数据）
 *
 * v0.0.9 新增：使用 languages.edges 的完整数据，而不仅仅是 primaryLanguage。
 *
 * 算法：
 * 1. 对每个仓库，提取 languages.edges 数据
 * 2. 计算仓库权重：w_repo = log(1 + stars)
 * 3. 对每种语言，计算其在仓库中的占比：lang_ratio = lang_size / total_size
 * 4. 累加每种语言的加权权重：w_lang += w_repo * lang_ratio
 * 5. 归一化为 0-1 之间的比例
 * 6. 按权重降序排列
 *
 * @param repos - 仓库列表
 * @returns 语言权重数组（按权重降序）
 *
 * @example
 * ```typescript
 * const repos = [
 *   {
 *     stargazerCount: 100,
 *     languages: {
 *       edges: [
 *         { size: 8000, node: { name: "TypeScript" } },
 *         { size: 2000, node: { name: "JavaScript" } }
 *       ]
 *     }
 *   }
 * ];
 * computeLanguageWeightsV2(repos);
 * // => [
 * //   { lang: "TypeScript", weight: 0.8, total_bytes: 8000, weighted_bytes: 3686.4 },
 * //   { lang: "JavaScript", weight: 0.2, total_bytes: 2000, weighted_bytes: 921.6 }
 * // ]
 * ```
 *
 * 设计理念：
 * - 使用 log(1+stars) 作为仓库权重，避免单个高 star 仓库主导结果
 * - 考虑语言在仓库中的实际占比（而不是简单的 0/1）
 * - 提供 total_bytes 和 weighted_bytes 用于透明度和调试
 * - 归一化为比例，便于跨用户比较
 */
export function computeLanguageWeightsV2(
  repos: RepoRecord[]
): { lang: string; weight: number; total_bytes: number; weighted_bytes: number }[] {
  const langStats = new Map<string, { total_bytes: number; weighted_bytes: number }>();

  // 累加每种语言的权重
  for (const repo of repos) {
    const languages = repo.languages?.edges;
    if (!languages || languages.length === 0) continue;

    const stars = repo.stargazerCount ?? 0;
    const repoWeight = Math.log1p(stars); // log(1 + stars)
    if (repoWeight <= 0) continue;

    // 计算仓库中所有语言的总字节数
    const totalSize = languages.reduce((sum, edge) => sum + edge.size, 0);
    if (totalSize === 0) continue;

    // 对每种语言，累加加权字节数
    for (const edge of languages) {
      const lang = edge.node.name;
      const weightedBytes = repoWeight * edge.size;

      const current = langStats.get(lang) ?? { total_bytes: 0, weighted_bytes: 0 };
      langStats.set(lang, {
        total_bytes: current.total_bytes + edge.size,
        weighted_bytes: current.weighted_bytes + weightedBytes
      });
    }
  }

  // 归一化为比例
  const entries = Array.from(langStats.entries());
  const totalWeightedBytes = entries.reduce((sum, [, stats]) => sum + stats.weighted_bytes, 0) || 1;

  return entries
    .map(([lang, stats]) => ({
      lang,
      weight: stats.weighted_bytes / totalWeightedBytes,
      total_bytes: stats.total_bytes,
      weighted_bytes: stats.weighted_bytes
    }))
    .sort((a, b) => b.weight - a.weight);
}

/**
 * 计算 Topics 权重
 *
 * v0.0.9 新增：基于 repositoryTopics 数据计算技术栈权重。
 *
 * 算法：
 * 1. 对每个仓库，提取 repositoryTopics.nodes 数据
 * 2. 计算仓库权重：w_repo = log(1 + stars)
 * 3. 对每个 topic，累加权重：w_topic += w_repo
 * 4. 归一化为 0-1 之间的比例
 * 5. 按权重降序排列
 *
 * @param repos - 仓库列表
 * @returns Topics 权重数组（按权重降序）
 *
 * @example
 * ```typescript
 * const repos = [
 *   {
 *     stargazerCount: 100,
 *     repositoryTopics: {
 *       nodes: [
 *         { topic: { name: "react" } },
 *         { topic: { name: "typescript" } }
 *       ]
 *     }
 *   }
 * ];
 * computeTopicWeights(repos);
 * // => [
 * //   { topic: "react", weight: 0.5, count: 1, weighted_count: 4.615 },
 * //   { topic: "typescript", weight: 0.5, count: 1, weighted_count: 4.615 }
 * // ]
 * ```
 *
 * 设计理念：
 * - 使用 log(1+stars) 作为仓库权重，避免单个高 star 仓库主导结果
 * - 提供 count（原始出现次数）和 weighted_count（加权次数）用于透明度
 * - 归一化为比例，便于跨用户比较
 * - Topics 可以补充语言分析（如 "react" 比 "JavaScript" 更具体）
 */
export function computeTopicWeights(
  repos: RepoRecord[]
): { topic: string; weight: number; count: number; weighted_count: number }[] {
  const topicStats = new Map<string, { count: number; weighted_count: number }>();

  // 累加每个 topic 的权重
  for (const repo of repos) {
    const topics = repo.repositoryTopics?.nodes;
    if (!topics || topics.length === 0) continue;

    const stars = repo.stargazerCount ?? 0;
    const repoWeight = Math.log1p(stars); // log(1 + stars)
    if (repoWeight <= 0) continue;

    for (const topicNode of topics) {
      const topic = topicNode.topic.name;
      const current = topicStats.get(topic) ?? { count: 0, weighted_count: 0 };
      topicStats.set(topic, {
        count: current.count + 1,
        weighted_count: current.weighted_count + repoWeight
      });
    }
  }

  // 归一化为比例
  const entries = Array.from(topicStats.entries());
  const totalWeightedCount = entries.reduce((sum, [, stats]) => sum + stats.weighted_count, 0) || 1;

  return entries
    .map(([topic, stats]) => ({
      topic,
      weight: stats.weighted_count / totalWeightedCount,
      count: stats.count,
      weighted_count: stats.weighted_count
    }))
    .sort((a, b) => b.weight - a.weight);
}

/**
 * 计算 24 小时活跃直方图（Hours 指标）
 *
 * 基于 PR 的创建时间，统计每个小时的活跃度。
 *
 * 算法（参考 mvp.md）：
 * 1. 对每个 PR，提取 createdAt 时间戳
 * 2. 转换为本地时间（使用 tzOffsetMinutes）
 * 3. 提取小时数（0-23）
 * 4. 在对应的桶中计数
 *
 * @param prs - PR 列表
 * @param tzOffsetMinutes - 时区偏移量（分钟，如 +08:00 = 480）
 * @returns 长度为 24 的数组，索引 i 表示 i:00 的 PR 数量
 *
 * @example
 * ```typescript
 * const prs = [
 *   { createdAt: "2024-01-15T15:30:00Z", ... },  // UTC 15:30
 *   { createdAt: "2024-01-16T01:00:00Z", ... }   // UTC 01:00
 * ];
 * computeHoursHistogram(prs, 8 * 60);  // +08:00 时区
 * // => [0, 0, ..., 0, 1, 0, ..., 0, 1, 0, ...]
 * //     索引 23 (15+8=23) 和索引 9 (1+8=9) 各有 1 个 PR
 * ```
 *
 * 设计理念：
 * - 使用 PR.createdAt 近似活跃时间（MVP 版本，参考 mvp.md）
 * - 后续可改用 commit.authoredDate 获得更精确的时间分布
 * - 时区偏移量支持手动覆盖（--tz 参数）
 */
export function computeHoursHistogram(prs: PRRecord[], tzOffsetMinutes: number): (number | null)[] {
  // 使用 (number | null) 保留“未观测到”的信息，调用方可以按需区分 0 和 null
  const buckets: (number | null)[] = new Array(24).fill(null);

  for (const pr of prs) {
    const dt = new Date(pr.createdAt);
    if (Number.isNaN(dt.getTime())) continue;

    // 转换为本地时间
    const utcHours = dt.getUTCHours();
    const localHours = (utcHours + tzOffsetMinutes / 60 + 24 * 3) % 24; // +24*3 防止负数
    const idx = Math.floor(localHours) % 24;
    // 理论上 buckets 长度恒为 24，但为防御性编程与 TypeScript 提示，使用 ?? 兜底
    const prev = buckets[idx] ?? 0;
    buckets[idx] = prev + 1;
  }

  return buckets;
}

/**
 * 计算核心活跃时段（Core Hours）
 *
 * 从 24 小时直方图中提取 Top 2 活跃时段。
 *
 * 算法：
 * 1. 对每个小时 h，计算 h 和 h+1 的总和（连续 2 小时窗口）
 * 2. 按总和降序排列
 * 3. 取 Top 2 时段
 *
 * @param hist - 24 小时直方图（来自 computeHoursHistogram）
 * @returns Top 2 时段数组，每个时段包含 start 和 end（格式如 "15:00"）
 *
 * @example
 * ```typescript
 * const hist = [2, 1, 0, ..., 20, 25, 30, 28, 20, ...];
 * computeCoreHours(hist);
 * // => [
 * //   { start: "15:00", end: "16:00" },  // 假设 15-16 时段最活跃
 * //   { start: "00:00", end: "01:00" }   // 假设 00-01 时段次活跃
 * // ]
 * ```
 *
 * 设计理念：
 * - 使用连续 2 小时窗口，避免单小时的偶然波动
 * - Top 2 时段可能不连续（如"下午 + 深夜"模式）
 * - 用于生成"当地时间 15:00-01:00 连续活跃"这样的描述（参考 pod.md）
 */
export function computeCoreHours(hist: (number | null)[]): { start: string; end: string }[] {
  // 当没有任何 PR 事件时，直方图所有桶为 0，此时不应“硬凑”出 2 个时段，
  // 而是返回空数组，表示“未知的活跃时段”。
  let total = 0;
  for (const v of hist) {
    total += v ?? 0;
  }
  if (total === 0) return [];

  const pairs: { start: number; end: number; value: number }[] = [];

  // 计算每个 2 小时窗口的总和
  for (let h = 0; h < 24; h++) {
    const next = (h + 1) % 24;
    const a = hist[h] ?? 0;
    const b = hist[next] ?? 0;
    const value = a + b;
    pairs.push({ start: h, end: next, value });
  }

  // 按总和降序排列，取 Top 2
  pairs.sort((a, b) => b.value - a.value);
  const top = pairs.slice(0, 2);

  return top.map((p) => ({ start: formatHour(p.start), end: formatHour(p.end) }));
}

/**
 * 计算上游倾向指数（UOI - Upstream Orientation Index）
 *
 * 衡量开发者对外部项目的贡献倾向。
 *
 * 算法（参考 mvp.md）：
 * UOI = 外部 PR 数 / (外部 PR 数 + 自有仓库 PR 数)
 *
 * @param prs - PR 列表
 * @param login - 用户名（用于区分自有仓库和外部仓库）
 * @returns UOI 值（0-1），越接近 1 表示越倾向于贡献外部项目
 *
 * @example
 * ```typescript
 * const prs = [
 *   { repository: { owner: { login: "alice" } }, ... },  // 自有仓库
 *   { repository: { owner: { login: "bob" } }, ... },    // 外部仓库
 *   { repository: { owner: { login: "carol" } }, ... }   // 外部仓库
 * ];
 * computeUoi(prs, "alice");
 * // => 0.67 (2 外部 / 3 总计)
 * ```
 *
 * 设计理念（参考 pod.md）：
 * - UOI 高（如 0.7+）：倾向于贡献上游项目，可能是开源贡献者
 * - UOI 低（如 0.3-）：主要在自己的仓库工作，可能是独立开发者
 * - UOI 中等（0.4-0.6）：平衡型，既维护自己的项目也参与外部协作
 */
export function computeUoi(prs: PRRecord[], login: string): number | null {
  let external = 0;
  let self = 0;
  const lower = login.toLowerCase();

  // 统计外部 PR 和自有仓库 PR
  for (const pr of prs) {
    const owner = pr.repository.owner.login.toLowerCase();
    if (owner === lower) self++;
    else external++;
  }

  const denom = external + self;
  if (denom === 0) return null;
  return external / denom;
}

/**
 * 计算外部 PR 合并率（协作质量指标）
 *
 * 衡量开发者向外部项目提交的 PR 被接受的比例。
 *
 * 算法（参考 mvp.md）：
 * accept_rate = 外部 merged PR / 外部 total PR
 *
 * @param prs - PR 列表
 * @param login - 用户名（用于区分自有仓库和外部仓库）
 * @returns 合并率（0-1），越接近 1 表示 PR 质量越高
 *
 * @example
 * ```typescript
 * const prs = [
 *   { repository: { owner: { login: "alice" } }, mergedAt: "2024-01-01", ... },  // 自有仓库（忽略）
 *   { repository: { owner: { login: "bob" } }, mergedAt: "2024-01-02", ... },    // 外部，已合并
 *   { repository: { owner: { login: "carol" } }, mergedAt: null, ... }           // 外部，未合并
 * ];
 * computeExternalPrAcceptRate(prs, "alice");
 * // => 0.5 (1 merged / 2 external)
 * ```
 *
 * 设计理念：
 * - 高合并率（如 0.7+）：PR 质量高，容易被上游接受
 * - 低合并率（如 0.3-）：可能是探索性 PR，或与上游沟通不足
 * - 只统计外部 PR，自有仓库的 PR 不计入（因为自己可以随时合并）
 */
export function computeExternalPrAcceptRate(prs: PRRecord[], login: string): number | null {
  const lower = login.toLowerCase();
  let externalTotal = 0;
  let merged = 0;

  // 只统计外部 PR
  for (const pr of prs) {
    const owner = pr.repository.owner.login.toLowerCase();
    if (owner === lower) continue; // 跳过自有仓库 PR
    externalTotal++;
    if (pr.mergedAt) merged++;
  }

  if (externalTotal === 0) return null;
  return merged / externalTotal;
}

/**
 * 计算代表作（Top Repos）
 *
 * 基于 star 数和活跃度，对仓库进行评分和排序。
 *
 * 算法（参考 mvp.md）：
 * score = stars^0.6 * recency_factor
 * - recency_factor = 1.3（近 12 个月有 push）或 1.0（其他）
 *
 * @param repos - 仓库列表
 * @param now - 当前时间（默认为 new Date()，主要用于测试）
 * @returns 按 score 降序排列的仓库列表
 *
 * @example
 * ```typescript
 * const repos = [
 *   { owner: { login: "alice" }, name: "old-lib", stargazerCount: 1000, pushedAt: "2020-01-01", ... },
 *   { owner: { login: "alice" }, name: "new-lib", stargazerCount: 500, pushedAt: "2024-12-01", ... }
 * ];
 * computeTopRepos(repos, new Date("2025-01-01"));
 * // => [
 * //   { repo: "alice/new-lib", stars: 500, score: 10.3, ... },  // 500^0.6 * 1.3 ≈ 10.3
 * //   { repo: "alice/old-lib", stars: 1000, score: 7.9, ... }   // 1000^0.6 * 1.0 ≈ 7.9
 * // ]
 * ```
 *
 * 设计理念：
 * - 使用 stars^0.6 而非线性，避免单个高 star 仓库主导（类似语言权重）
 * - 近期活跃的仓库加权 1.3，鼓励持续维护
 * - 包含 isFork 字段，便于识别是否为原创项目
 * - 输出到 top_repos.json，供 AI 生成"代表作"描述
 */
export function computeTopRepos(repos: RepoRecord[], now: Date = new Date()) {
  const yearMs = 365 * 24 * 60 * 60 * 1000;

  return repos
    .map((repo) => {
      const stars = repo.stargazerCount ?? 0;
      const pushedAt = repo.pushedAt ? new Date(repo.pushedAt) : null;
      const recent = pushedAt ? now.getTime() - pushedAt.getTime() <= yearMs : false;
      const recencyFactor = recent ? 1.3 : 1;
      const score = Math.pow(stars, 0.6) * recencyFactor;
      return {
        repo: `${repo.owner.login}/${repo.name}`,
        lang: repo.primaryLanguage?.name ?? null,
        stars,
        score,
        isFork: repo.isFork,
        lastPush: repo.pushedAt
      };
    })
    .sort((a, b) => b.score - a.score);
}

/**
 * 解析时区偏移量
 *
 * 将时区字符串（如 "+08:00" 或 "Asia/Shanghai"）转换为分钟偏移量。
 *
 * @param tz - 时区字符串（可选）
 * @returns 时区偏移量（分钟），如 +08:00 = 480，-05:00 = -300
 *
 * @example
 * ```typescript
 * parseTimezoneOffset("+08:00")       // => 480
 * parseTimezoneOffset("-05:00")       // => -300
 * parseTimezoneOffset("Asia/Shanghai") // => 480
 * parseTimezoneOffset(null)           // => 0 (UTC)
 * parseTimezoneOffset("invalid")      // => 0 (fallback to UTC)
 * ```
 *
 * 设计理念：
 * - 支持偏移量格式（如 "+08:00"）和 IANA 时区名称（如 "Asia/Shanghai"）
 * - MVP 版本只硬编码了常见时区，后续可扩展为完整的 IANA 数据库
 * - 无效输入时返回 0（UTC），避免抛出错误
 */
export function parseTimezoneOffset(tz?: string | null): number {
  if (!tz) return 0; // 默认 UTC

  // 尝试解析偏移量格式（如 "+08:00"）
  const offsetMatch = tz.match(/^([+-])(\d{2}):(\d{2})$/);
  if (offsetMatch) {
    const sign = offsetMatch[1] === "-" ? -1 : 1;
    const hours = Number(offsetMatch[2]);
    const minutes = Number(offsetMatch[3]);
    return sign * (hours * 60 + minutes);
  }

  // 硬编码的 IANA 时区名称（MVP 版本）
  if (tz === "Asia/Shanghai") {
    return 8 * 60;
  }

  // 无法识别的时区，fallback 到 UTC
  return 0;
}

/**
 * 构建时区信息对象
 *
 * 生成 profile.json 中的 timezone 字段。
 *
 * @param tzOverride - 用户指定的时区覆盖参数
 * @param tzOffsetMinutes - 解析后的时区偏移量（分钟）
 * @returns 包含 auto/override/used 三个字段的时区对象
 *
 * @example
 * ```typescript
 * buildTimezone("Asia/Shanghai", 480);
 * // => {
 * //   auto: "+00:00",
 * //   override: "Asia/Shanghai",
 * //   used: "+08:00"
 * // }
 * ```
 *
 * 设计理念：
 * - auto: 自动推断的时区（MVP 版本暂未实现，固定为 UTC）
 * - override: 用户通过 --tz 参数指定的时区
 * - used: 实际使用的时区（如果有 override 则使用 override，否则使用 auto）
 * - 后续可扩展 auto 字段，从 commit 的 tzOffset 推断（参考 pod.md）
 */
export function buildTimezone(
  tzOverride: string | null | undefined,
  tzOffsetMinutes: number
): { auto: string | null; override: string | null; used: string | null } {
  const override = tzOverride ?? null;
  const usedOffset = override ? tzOffsetMinutes : 0;
  const usedStr = formatOffset(usedOffset);

  return {
    auto: "+00:00",  // MVP 版本暂未实现自动推断，固定为 UTC
    override,
    used: usedStr
  };
}

/**
 * 构建证据样本
 *
 * 提取前 5 个 PR 和前 5 个仓库的 URL，作为 AI 生成具体案例的证据。
 *
 * @param _login - 用户名（当前未使用，保留用于未来扩展）
 * @param repos - 仓库列表
 * @param prs - PR 列表
 * @returns 包含 sample_prs 和 sample_repos 的对象
 *
 * @example
 * ```typescript
 * buildSummaryEvidence("alice", repos, prs);
 * // => {
 * //   sample_prs: [
 * //     "https://github.com/bob/project/pull/123",
 * //     "https://github.com/carol/lib/pull/456",
 * //     ...
 * //   ],
 * //   sample_repos: [
 * //     "https://github.com/alice/my-lib",
 * //     "https://github.com/alice/my-tool",
 * //     ...
 * //   ]
 * // }
 * ```
 *
 * 设计理念（参考 pod.md）：
 * - 所有结论都可回溯到原始证据
 * - AI 可以从这些样本中选择具体案例来生成描述
 * - 限制为前 5 个，避免 JSON 过大
 */
export function buildSummaryEvidence(
  _login: string,
  repos: RepoRecord[],
  prs: PRRecord[]
): { sample_prs: string[]; sample_repos: string[] } {
  const sample_prs = prs.slice(0, 5).map((pr) => pr.url);
  const sample_repos = repos
    .slice(0, 5)
    .map((r) => `https://github.com/${r.owner.login}/${r.name}`);

  return { sample_prs, sample_repos };
}

/**
 * 分析 Profile README
 *
 * 识别开发者的 GitHub Profile README 风格，并提取文本和图片信息。
 *
 * @param markdown - Profile README 的 Markdown 内容（可为 null）
 * @returns Profile README 分析结果
 *
 * 风格分类规则：
 * - "none": markdown 为 null（没有 Profile README）
 * - "empty": markdown 存在但为空字符串
 * - "one_liner": 单行简介（≤1 行文本，≤140 字符，无图片）
 * - "short_bio": 短文本简介（≥2 行文本，≥80 字符，无图片）
 * - "visual_dashboard": 视觉仪表盘（图片数量 ≥ 文本行数）
 * - "mixed": 混合风格（其他情况）
 *
 * @example
 * ```typescript
 * analyzeProfileReadme("# Hi, I'm Alice\n\nI love TypeScript!");
 * // => {
 * //   style: "short_bio",
 * //   markdown: "# Hi, I'm Alice\n\nI love TypeScript!",
 * //   text_excerpt: "Hi, I'm Alice\nI love TypeScript!",
 * //   image_alt_texts: []
 * // }
 *
 * analyzeProfileReadme("![Stats](https://example.com/stats.svg)\n![Languages](https://example.com/langs.svg)");
 * // => {
 * //   style: "visual_dashboard",
 * //   markdown: "...",
 * //   text_excerpt: null,
 * //   image_alt_texts: ["Stats", "Languages"]
 * // }
 * ```
 *
 * 设计理念：
 * - Profile README 风格可能反映开发者的个性和沟通风格
 * - "one_liner" 可能表示简洁务实
 * - "visual_dashboard" 可能表示注重数据展示和视觉效果
 * - "short_bio" 可能表示注重文字表达和自我介绍
 * - 提取的文本和图片信息可供 AI 生成更丰富的画像描述
 */
export function analyzeProfileReadme(markdown: string | null): ProfileReadmeAnalysis {
  // 处理 null 情况（没有 Profile README）
  if (markdown == null) {
    return {
      style: "none",
      markdown: null,
      plain_text: null,
      text_excerpt: null,
      image_alt_texts: []
    };
  }

  const raw = markdown;
  const trimmed = raw.trim();

  // 处理空字符串情况
  if (!trimmed) {
    return {
      style: "empty",
      markdown: "",
      plain_text: "",
      text_excerpt: null,
      image_alt_texts: []
    };
  }

  // 提取图片的 alt 文本
  const imageAltTexts: string[] = [];

  // 提取 Markdown 图片语法：![alt](url)
  const imageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
  let match: RegExpExecArray | null;
  while ((match = imageRegex.exec(raw)) !== null) {
    const alt = match[1]?.trim();
    if (alt) imageAltTexts.push(alt);
  }

  // 提取 HTML img 标签的 alt 属性
  const imgTagRegex = /<img[^>]*alt=["']([^"']+)["'][^>]*>/gi;
  while ((match = imgTagRegex.exec(raw)) !== null) {
    const alt = match[1]?.trim();
    if (alt) imageAltTexts.push(alt);
  }

  // 提取纯文本内容（去除 Markdown 格式）
  const lines = raw.split(/\r?\n/);
  const textLines: string[] = [];

  for (const line of lines) {
    const stripped = stripMarkdownFormatting(line).trim();
    if (stripped.length === 0) continue;
    textLines.push(stripped);
  }

  const textCharCount = textLines.reduce((sum, l) => sum + l.length, 0);
  const imageCount = imageAltTexts.length;
  const plainText = textLines.length === 0 ? null : textLines.join("\n");

  // 根据文本和图片数量判断风格
  let style: ProfileReadmeStyle;

  if (textLines.length <= 1 && textCharCount <= 140 && imageCount === 0) {
    // 单行简介（类似 Twitter bio）
    style = "one_liner";
  } else if (imageCount > 0 && imageCount >= textLines.length) {
    // 图片主导（如 GitHub Stats 仪表盘）
    style = "visual_dashboard";
  } else if (textLines.length >= 2 && textCharCount >= 80 && imageCount === 0) {
    // 多行文本简介
    style = "short_bio";
  } else {
    // 混合风格
    style = "mixed";
  }

  // 提取文本摘要（前 400 字符）
  const textExcerpt = plainText == null ? null : plainText.slice(0, 400);

  return {
    style,
    markdown: raw,
    plain_text: plainText,
    text_excerpt: textExcerpt,
    image_alt_texts: imageAltTexts
  };
}

const KNOWN_LANGUAGES = [
  "TypeScript",
  "JavaScript",
  "Python",
  "Go",
  "Rust",
  "Java",
  "C++",
  "C#",
  "C",
  "Ruby",
  "PHP",
  "Kotlin",
  "Swift",
  "Scala",
  "Haskell",
  "Elixir",
  "Clojure",
  "Dart",
  "Objective-C",
  "Shell",
  "Bash",
  "Lua"
] as const;

/**
 * JavaScript 生态的框架/运行时/库，在 README 中提及时应映射到 JavaScript
 *
 * 设计理念：
 * - Node.js / Next.js / Vue.js / React 等都是 JavaScript 技术栈
 * - 用户在 README 中写 "Node.js" 时，实际表达的是 "JavaScript (Node.js 运行时)"
 * - 这些关键词应该被识别并归一化为 "JavaScript"
 */
const JS_ECOSYSTEM_KEYWORDS = [
  "Node.js",
  "Node",
  "Next.js",
  "Next",
  "Vue.js",
  "Vue",
  "React.js",
  "React",
  "Svelte",
  "Angular",
  "Nuxt.js",
  "Nuxt",
  "Express.js",
  "Express",
  "Nest.js",
  "NestJS"
] as const;

/**
 * 从 Profile README 中提取自述的语言列表
 *
 * 改进点（v0.0.7）：
 * - 修复 C# 的正则匹配问题（`\bC#\b` 无法匹配，改用前瞻断言）
 * - 添加 JavaScript 生态关键词映射（Node.js / Next.js / Vue / React 等 → JavaScript）
 * - 添加 C 语言支持
 * - 添加 Lua 语言支持
 *
 * 设计理念：
 * - 同时考虑纯文本和图片 alt 文本（很多 README 通过徽章展示语言）
 * - 仅使用简单的基于关键字的启发式规则，保证可解释和可复现
 * - 将框架/运行时映射到对应的编程语言（如 Node.js → JavaScript）
 */
function extractReadmeLanguages(readme: ProfileReadmeAnalysis): string[] {
  const texts: string[] = [];

  if (readme.plain_text) {
    texts.push(readme.plain_text);
  }

  if (readme.image_alt_texts && readme.image_alt_texts.length > 0) {
    texts.push(readme.image_alt_texts.join(" "));
  }

  if (texts.length === 0 && readme.markdown) {
    texts.push(readme.markdown);
  }

  if (texts.length === 0) {
    return [];
  }

  const haystack = texts.join("\n");
  const found = new Set<string>();

  // 第一步：提取标准编程语言
  for (const lang of KNOWN_LANGUAGES) {
    let pattern: RegExp;

    switch (lang) {
      case "C++":
        // C++ 需要转义 +
        pattern = /\bC\+\+(?=\s|,|;|\.|$)/i;
        break;
      case "C#":
        // C# 的 # 不是单词字符，不能用 \b 作为后边界
        // 使用前瞻断言确保后面是空白、逗号、分号、句号或行尾
        pattern = /\bC#(?=\s|,|;|\.|$)/i;
        break;
      case "C":
        // C 语言需要特殊处理，避免匹配到 C++ / C# / Objective-C
        // 只匹配独立的 "C" 且后面不是 + 或 #
        pattern = /\bC(?![+#])(?=\s|,|;|\.|$)/i;
        break;
      case "Objective-C":
        pattern = /\bObjective-C\b/i;
        break;
      default:
        pattern = new RegExp(`\\b${lang}\\b`, "i");
        break;
    }

    if (pattern.test(haystack)) {
      found.add(lang);
    }
  }

  // 第二步：检测 JavaScript 生态关键词并映射到 JavaScript
  for (const keyword of JS_ECOSYSTEM_KEYWORDS) {
    // 转义特殊字符（如 . 在正则中需要转义）
    const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = new RegExp(`\\b${escaped}\\b`, "i");

    if (pattern.test(haystack)) {
      // 将这些关键词映射到 JavaScript
      found.add("JavaScript");
      break; // 只需要添加一次 JavaScript
    }
  }

  return Array.from(found);
}

/**
 * 从 Profile README 中提取技术栈/主题关键词
 *
 * v0.0.9 新增：提取 README 中提到的常见技术栈关键词（如 "react", "docker", "kubernetes"）。
 *
 * 算法：
 * 1. 从 README 的纯文本和图片 alt 文本中提取文本
 * 2. 使用常见技术栈关键词列表进行匹配
 * 3. 返回匹配到的关键词（小写）
 *
 * @param readme - Profile README 分析结果
 * @returns 提取到的 topics 列表（小写）
 *
 * 设计理念：
 * - 使用简单的基于关键字的启发式规则，保证可解释和可复现
 * - 关键词列表覆盖常见的框架、工具、平台、技术栈
 * - 返回小写形式，便于与 repositoryTopics 进行比较
 */
function extractReadmeTopics(readme: ProfileReadmeAnalysis): string[] {
  const texts: string[] = [];

  if (readme.plain_text) {
    texts.push(readme.plain_text);
  }

  if (readme.image_alt_texts && readme.image_alt_texts.length > 0) {
    texts.push(readme.image_alt_texts.join(" "));
  }

  if (texts.length === 0 && readme.markdown) {
    texts.push(readme.markdown);
  }

  if (texts.length === 0) {
    return [];
  }

  const haystack = texts.join("\n").toLowerCase();
  const found = new Set<string>();

  // 常见技术栈关键词列表（小写）
  const KNOWN_TOPICS = [
    // 前端框架
    "react", "vue", "angular", "svelte", "next.js", "nuxt", "gatsby",
    // 后端框架
    "express", "fastify", "koa", "nest", "django", "flask", "fastapi", "rails", "spring", "laravel",
    // 移动开发
    "react-native", "flutter", "ionic", "xamarin",
    // 数据库
    "postgresql", "mysql", "mongodb", "redis", "elasticsearch", "sqlite", "cassandra",
    // 云平台
    "aws", "azure", "gcp", "vercel", "netlify", "heroku", "digitalocean",
    // 容器/编排
    "docker", "kubernetes", "k8s", "helm", "terraform",
    // CI/CD
    "github-actions", "gitlab-ci", "jenkins", "circleci", "travis-ci",
    // 测试
    "jest", "mocha", "pytest", "junit", "cypress", "selenium",
    // 构建工具
    "webpack", "vite", "rollup", "esbuild", "parcel", "babel",
    // 包管理
    "npm", "yarn", "pnpm", "pip", "cargo", "maven", "gradle",
    // 其他工具
    "graphql", "rest", "grpc", "websocket", "oauth", "jwt",
    // 机器学习
    "tensorflow", "pytorch", "scikit-learn", "keras", "pandas", "numpy",
    // 区块链
    "ethereum", "solidity", "web3", "blockchain",
    // 游戏开发
    "unity", "unreal", "godot"
  ];

  for (const topic of KNOWN_TOPICS) {
    // 转义特殊字符（如 . 在正则中需要转义）
    const escaped = topic.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = new RegExp(`\\b${escaped}\\b`, "i");

    if (pattern.test(haystack)) {
      found.add(topic);
    }
  }

  return Array.from(found).sort();
}

/**
 * 从 Profile README 中提取指向自有仓库的 GitHub 链接
 *
 * 仅识别形如 https://github.com/<login>/<repo> 的链接，并归一化为小写 owner/repo。
 */
function extractOwnedRepoMentions(readme: ProfileReadmeAnalysis, login: string): string[] {
  const markdown = readme.markdown;
  if (!markdown || !login) return [];

  const ownerLower = login.toLowerCase();
  const ownerPattern = ownerLower.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&");
  const regex = new RegExp(`https://github\\.com/${ownerPattern}/([A-Za-z0-9_.-]+)`, "gi");

  const result = new Set<string>();
  let match: RegExpExecArray | null;

  while ((match = regex.exec(markdown)) !== null) {
    const repoName = match[1];
    if (!repoName) continue;
    result.add(`${ownerLower}/${repoName.toLowerCase()}`);
  }

  return Array.from(result);
}

/**
 * 计算 Profile README 与行为数据之间的一致性信号
 *
 * - 比较 README 自述的语言和 skills 中的语言分布
 * - 对比 README 中提到的自有仓库与 repos 列表
 * - 不给出“真/假”结论，只输出可回溯的信号和简单等级
 */
export function computeReadmeConsistency(
  readme: ProfileReadmeAnalysis,
  skills: { lang: string; weight: number }[],
  login: string,
  repos: RepoRecord[]
): ConsistencySignals {
  const readmeLanguages = extractReadmeLanguages(readme);
  const metricLanguages = skills.map((s) => s.lang);
  const metricLanguageSet = new Set(metricLanguages.map((l) => l.toLowerCase()));

  const languageOverlap: string[] = [];
  for (const lang of readmeLanguages) {
    if (metricLanguageSet.has(lang.toLowerCase())) {
      languageOverlap.push(lang);
    }
  }

  let supportedRatio: number | null = null;
  if (readmeLanguages.length > 0) {
    supportedRatio = languageOverlap.length / readmeLanguages.length;
  }

  let consistencyLevel: ConsistencySignals["readme_vs_skills_consistency"];
  if (supportedRatio == null) {
    consistencyLevel = "unknown";
  } else if (supportedRatio >= 0.8) {
    consistencyLevel = "strong";
  } else if (supportedRatio >= 0.4) {
    consistencyLevel = "partial";
  } else {
    consistencyLevel = "poor";
  }

  const ownerLower = login.toLowerCase();
  const ownedReposMentioned = extractOwnedRepoMentions(readme, login);

  const ownedReposInDataSet = new Set(
    repos
      .filter((r) => r.owner.login.toLowerCase() === ownerLower)
      .map((r) => `${ownerLower}/${r.name.toLowerCase()}`)
  );

  const ownedReposFoundInData: string[] = [];
  const ownedReposMissingInData: string[] = [];

  for (const full of ownedReposMentioned) {
    if (ownedReposInDataSet.has(full)) {
      ownedReposFoundInData.push(full);
    } else {
      ownedReposMissingInData.push(full);
    }
  }

  // v0.0.9: 提取 README 中提到的 topics（从文本中提取常见技术栈关键词）
  const readmeTopics = extractReadmeTopics(readme);

  // v0.0.9: 提取行为数据中的 topics（从 repositoryTopics 中提取）
  const metricTopicsSet = new Set<string>();
  for (const repo of repos) {
    const topics = repo.repositoryTopics?.nodes;
    if (topics) {
      for (const topicNode of topics) {
        metricTopicsSet.add(topicNode.topic.name.toLowerCase());
      }
    }
  }
  const metricTopics = Array.from(metricTopicsSet).sort();

  // v0.0.9: 计算 topic 重叠
  const topicOverlap: string[] = [];
  for (const topic of readmeTopics) {
    if (metricTopicsSet.has(topic.toLowerCase())) {
      topicOverlap.push(topic);
    }
  }

  return {
    readme_languages: readmeLanguages,
    metric_languages: metricLanguages,
    language_overlap: languageOverlap,
    readme_language_supported_ratio: supportedRatio,
    readme_vs_skills_consistency: consistencyLevel,
    owned_repos_mentioned: ownedReposMentioned,
    owned_repos_found_in_data: ownedReposFoundInData,
    owned_repos_missing_in_data: ownedReposMissingInData,
    readme_topics: readmeTopics,
    metric_topics: metricTopics,
    topic_overlap: topicOverlap
  };
}

/**
 * 去除 Markdown 格式，提取纯文本
 *
 * 内部辅助函数，用于从 Markdown 行中提取纯文本内容。
 *
 * @param line - Markdown 行
 * @returns 去除格式后的纯文本
 *
 * 处理的格式：
 * - 图片语法：![alt](url) -> 空格
 * - 链接语法：[text](url) -> text
 * - 行内代码：`code` -> code
 * - 标题/列表/引用标记：# / * / - / + / > -> 空
 * - HTML 标签：<tag> -> 空格
 */
function stripMarkdownFormatting(line: string): string {
  let result = line;

  // 完全移除图片语法
  result = result.replace(/!\[[^\]]*\]\([^)]+\)/g, " ");

  // 将链接替换为链接文本
  result = result.replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1");

  // 移除行内代码标记
  result = result.replace(/`([^`]+)`/g, "$1");

  // 移除行首的标题/列表/引用标记
  result = result.replace(/^(\s*[*\-+>]|#{1,6})\s+/g, "");

  // 移除 HTML 标签
  result = result.replace(/<[^>]+>/g, " ");

  return result;
}

/**
 * 格式化小时数为字符串
 *
 * @param h - 小时数（0-23）
 * @returns 格式化的小时字符串（如 "15:00"）
 */
function formatHour(h: number): string {
  const hh = h.toString().padStart(2, "0");
  return `${hh}:00`;
}

/**
 * 格式化时区偏移量为字符串
 *
 * @param minutes - 时区偏移量（分钟）
 * @returns 格式化的偏移量字符串（如 "+08:00", "-05:00"）
 *
 * @example
 * ```typescript
 * formatOffset(480)   // => "+08:00"
 * formatOffset(-300)  // => "-05:00"
 * formatOffset(0)     // => "+00:00"
 * ```
 */
function formatOffset(minutes: number): string {
  const sign = minutes < 0 ? "-" : "+";
  const abs = Math.abs(minutes);
  const h = Math.floor(abs / 60)
    .toString()
    .padStart(2, "0");
  const m = (abs % 60).toString().padStart(2, "0");
  return `${sign}${h}:${m}`;
}

