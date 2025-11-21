import type { RepoRecord, PRRecord, CommitRecord, ContributionsSummary } from "../types/github";

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
  const totalWeightedBytes =
    entries.reduce((sum, [, stats]) => sum + stats.weighted_bytes, 0) || 1;

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
 * 计算 Focus Ratio（专注率，纯字节视角）。
 *
 * - 使用 languages.edges.size 的原始 bytes 聚合，不做 star 加权；
 * - 将所有仓库的语言字节数相加，计算 Top1 语言的字节占比：
 *   focus_ratio = max(bytes_lang) / sum(bytes_all_langs)
 * - 用于刻画“主要精力是否集中在单一语言栈”。
 */
export function computeFocusRatio(
  repos: RepoRecord[]
): { value: number | null; sample_size: number } {
  const langBytes = new Map<string, number>();

  for (const repo of repos) {
    const languages = repo.languages?.edges;
    if (!languages || languages.length === 0) continue;

    for (const edge of languages) {
      const lang = edge.node.name;
      const prev = langBytes.get(lang) ?? 0;
      langBytes.set(lang, prev + edge.size);
    }
  }

  let totalBytes = 0;
  let maxBytes = 0;
  for (const bytes of langBytes.values()) {
    totalBytes += bytes;
    if (bytes > maxBytes) maxBytes = bytes;
  }

  if (totalBytes <= 0) {
    return { value: null, sample_size: 0 };
  }

  const value = maxBytes / totalBytes;
  return { value, sample_size: totalBytes };
}

/**
 * 计算 Topics 权重
 *
 * v0.0.9 新增：基于 repositoryTopics 数据计算技术栈权重。
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
  const totalWeightedCount =
    entries.reduce((sum, [, stats]) => sum + stats.weighted_count, 0) || 1;

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
 * 计算 Grit Factor v2（有效交付率）。
 *
 * 设计目标：
 * - 只基于“原创自有仓库”（owner=login 且 isFork=false）；
 * - 将每个仓库按生命周期和 star 数分为 Long Term / Gem / Churn；
 * - value = (Long Term + Gem) / 原创自有仓库总数。
 *
 * 术语（v0 阈值，可后续调整）：
 * - THRESHOLD_LONG_TERM_DAYS = 90 天：生命周期 ≥ 90 天视为长期维护；
 * - THRESHOLD_GEM_STARS = 5：生命周期 < 90 天但 star ≥ 5 视为“小而美/MVP”。
 */
const THRESHOLD_LONG_TERM_DAYS = 90;
const THRESHOLD_GEM_STARS = 5;

export function computeGritFactor(
  repos: RepoRecord[],
  login: string,
): {
  value: number | null;
  sample_size: number;
  long_term_count: number;
  gem_count: number;
  churn_count: number;
} {
  const lowerLogin = login.toLowerCase();

  // 1. 预筛选：仅保留“原创自有仓库”（owner=login 且 isFork=false）
  const original = repos.filter(
    (repo) => !repo.isFork && repo.owner?.login?.toLowerCase() === lowerLogin,
  );

  const sampleSize = original.length;
  if (sampleSize === 0) {
    return {
      value: null,
      sample_size: 0,
      long_term_count: 0,
      gem_count: 0,
      churn_count: 0,
    };
  }

  let longTerm = 0;
  let gem = 0;
  let churn = 0;

  const MS_PER_DAY = 1000 * 60 * 60 * 24;

  for (const repo of original) {
    const createdAt = repo.createdAt;
    const pushedAt = repo.pushedAt ?? repo.createdAt;

    const createdTime = new Date(createdAt).getTime();
    const pushedTime = new Date(pushedAt).getTime();

    let diffMs = pushedTime - createdTime;
    if (!Number.isFinite(diffMs)) {
      diffMs = 0;
    }
    if (diffMs < 0) diffMs = 0;

    const lifeSpanDays = Math.floor(diffMs / MS_PER_DAY);
    const stars = repo.stargazerCount ?? 0;

    if (lifeSpanDays >= THRESHOLD_LONG_TERM_DAYS) {
      longTerm += 1;
    } else if (stars >= THRESHOLD_GEM_STARS) {
      // lifeSpanDays < THRESHOLD_LONG_TERM_DAYS 已通过上面的分支隐式保证
      gem += 1;
    } else {
      churn += 1;
    }
  }

  const effective = longTerm + gem;
  const value = effective / sampleSize;

  return {
    value,
    sample_size: sampleSize,
    long_term_count: longTerm,
    gem_count: gem,
    churn_count: churn,
  };
}


/**
 * 计算 24 小时活跃直方图（Hours 指标）
 *
 * 基于 PR 的创建时间，统计每个小时的活跃度。
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
 * 计算 Night Ratio（熬夜率）。
 *
 * - 仅使用 commit.authoredAt 作为“写代码时间”的代理；
 * - 排除 merge commit（isMerge=true），避免一键合并/CI 噪声；
 * - 先转成本地小时（与 PR hours 使用同一 tzOffsetMinutes），再判断是否落在夜间窗口。
 *
 * 夜间窗口 v0 约定为当地时间 [22:00, 04:00]，即小时桶 {22, 23, 0, 1, 2, 3, 4}。
 */
export function computeNightRatio(
  commits: CommitRecord[] | undefined,
  tzOffsetMinutes: number
): { value: number | null; sample_size: number } {
  const list = commits ?? [];

  let night = 0;
  let total = 0;

  for (const c of list) {
    // 排除 merge commit
    if (c.isMerge) continue;

    const dt = new Date(c.authoredAt);
    if (Number.isNaN(dt.getTime())) continue;

    total++;

    const utcHours = dt.getUTCHours();
    const localHours = (utcHours + tzOffsetMinutes / 60 + 24 * 3) % 24;
    const hour = Math.floor(localHours) % 24;

    // 夜间小时集合：22, 23, 0, 1, 2, 3, 4
    if (hour === 22 || hour === 23 || hour === 0 || hour === 1 || hour === 2 || hour === 3 || hour === 4) {
      night++;
    }
  }

  if (total === 0) {
    return { value: null, sample_size: 0 };
  }

  return { value: night / total, sample_size: total };
}


/**
 * 计算上游倾向指数（UOI - Upstream Orientation Index）
 *
 * 衡量开发者对外部项目的贡献倾向。
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
 * 计算 Uni Index v0（协作光谱的 MVP 实现）。
 *
 * - owned 侧：自有仓库（个人 + 可选的 org 仓库）的 commits + PRs
 * - external 侧：外部仓库的 PRs
 */
export function computeUniIndexV0(
  prs: PRRecord[],
  commits: import("../types/github").CommitRecord[] | undefined,
  login: string,
  userInfo: import("../types/github").UserInfo | null | undefined,
  includeOrgRepos: boolean = true,
): { value: number | null; sample_size: number; include_org_repos: boolean } {
  const lowerLogin = login.toLowerCase();
  const orgLogins = new Set(
    includeOrgRepos ? (userInfo?.organizations ?? []).map((o) => o.login.toLowerCase()) : [],
  );

  let ownedActivity = 0;
  let externalActivity = 0;

  // commits：只统计 isOwn=true 的 commit，视为 owned 侧的基础活跃
  const commitList = commits ?? [];
  for (const c of commitList) {
    if (c.repo.isOwn) {
      ownedActivity += 1; // v0：先采用每个 commit 记 1 分，后续可按 stats 加权
    }
  }

  // PR：根据仓库 owner 将 PR 分为 owned vs external
  for (const pr of prs) {
    const owner = pr.repository.owner.login.toLowerCase();
    const isSelf = owner === lowerLogin;
    const isOrg = orgLogins.has(owner);
    const isOwnedSide = isSelf || isOrg;

    // 基础权重：每个 PR 记 1 分，合并的 PR 额外 +1 分
    const base = 1;
    const mergedBonus = pr.mergedAt ? 1 : 0;
    const score = base + mergedBonus;

    if (isOwnedSide) ownedActivity += score;
    else externalActivity += score;
  }

  const totalActivity = ownedActivity + externalActivity;
  if (totalActivity <= 0) {
    return { value: null, sample_size: 0, include_org_repos: includeOrgRepos };
  }

  const value = ownedActivity / totalActivity;
  const sampleSize = commitList.length + prs.length;
  return { value, sample_size: sampleSize, include_org_repos: includeOrgRepos };
}

/**
 * 计算 Fork Destiny（分歧指数 v0）。
 *
 * 设计目标：
 * - 单位：自有 fork 仓库（owner=login 且 isFork=true）
 * - 使用 commits.associatedPRs 捕捉从 fork -> 上游仓库的 PR 及其合并状态；
 * - 再结合 fork 与母仓的 star 数，将 fork 分成三类：
 *   - contributor_forks：至少有一条指向上游仓库且被合并的 PR（归顺派）
 *   - variant_forks：没有被合并，但自身 star 很高，或相对母仓的 star 占比很高（变体领袖）
 *   - noise_forks：既没被合并，也几乎没人 star 的 fork（路人 / 噪声）
 *
 * 注意：
 * - 由于我们只抓取默认分支上的 commit，且只看与 commit 关联的 PR，
 *   所以 contributor_forks 是“保守下界”：有可能漏掉未出现在 commit.associatedPRs 里的 PR。
 */
export function computeForkDestiny(
  repos: RepoRecord[],
  commits: CommitRecord[] | undefined,
  login: string,
): {
  total_forks: number;
  contributor_forks: number;
  variant_forks: number;
  noise_forks: number;
  total_fork_stars: number;
  variant_fork_stars: number;
} {
  const lowerLogin = login.toLowerCase();

  // 只统计“自有 fork”：owner=login 且 isFork=true
  const ownedForks = repos.filter(
    (repo) => repo.isFork && repo.owner.login.toLowerCase() === lowerLogin,
  );

  const totalForks = ownedForks.length;
  if (totalForks === 0) {
    return {
      total_forks: 0,
      contributor_forks: 0,
      variant_forks: 0,
      noise_forks: 0,
      total_fork_stars: 0,
      variant_fork_stars: 0,
    };
  }

  type ForkInfo = {
    repoKey: string;
    owner: string;
    name: string;
    stars: number;
    hasMergedExternalPr: boolean;
    maxBaseStars: number | null;
  };

  const forkMap = new Map<string, ForkInfo>();
  for (const repo of ownedForks) {
    const key = `${repo.owner.login.toLowerCase()}/${repo.name.toLowerCase()}`;
    forkMap.set(key, {
      repoKey: key,
      owner: repo.owner.login,
      name: repo.name,
      stars: repo.stargazerCount ?? 0,
      hasMergedExternalPr: false,
      maxBaseStars: null,
    });
  }

  const commitList = commits ?? [];
  for (const commit of commitList) {
    const key = `${commit.repo.owner.toLowerCase()}/${commit.repo.name.toLowerCase()}`;
    const info = forkMap.get(key);
    if (!info) continue;

    for (const pr of commit.associatedPRs ?? []) {
      if (!pr.isCrossRepository) continue;
      const baseRepo = pr.baseRepo;
      if (!baseRepo) continue;

      const baseOwner = baseRepo.owner.toLowerCase();
      if (baseOwner === lowerLogin) {
        // self/self 之间的 fork，视为内部移动而非“归顺上游”
        continue;
      }

      const baseStars = baseRepo.stargazerCount ?? 0;
      if (baseStars > 0) {
        if (info.maxBaseStars == null || baseStars > info.maxBaseStars) {
          info.maxBaseStars = baseStars;
        }
      }

      if (pr.isMerged) {
        info.hasMergedExternalPr = true;
      }
    }
  }

  // v0 阈值：
  // - 绝对阈值：fork 自身 star >= 50 视为“有一定气候”的独立路线
  // - 相对阈值：fork star / 母仓 star >= 0.3 视为“相对体量可观”的变体
  const ABS_VARIANT_STAR = 50;
  const REL_VARIANT_RATIO = 0.3;

  let contributor = 0;
  let variant = 0;
  let noise = 0;
  let totalStars = 0;
  let variantStars = 0;

  for (const info of forkMap.values()) {
    const stars = info.stars;
    totalStars += stars;

    if (info.hasMergedExternalPr) {
      contributor += 1;
      continue;
    }

    const absHigh = stars >= ABS_VARIANT_STAR;
    const relHigh =
      info.maxBaseStars != null &&
      info.maxBaseStars > 0 &&
      stars / info.maxBaseStars >= REL_VARIANT_RATIO;

    if (absHigh || relHigh) {
      variant += 1;
      variantStars += stars;
    } else {
      noise += 1;
    }
  }

  return {
    total_forks: totalForks,
    contributor_forks: contributor,
    variant_forks: variant,
    noise_forks: noise,
    total_fork_stars: totalStars,
    variant_fork_stars: variantStars,
  };
}

/**
 * 计算 Community Engagement（社区卷入度 v0）。
 *
 * 数据来源：scan 阶段写入的 contributions.json（ContributionsSummary）。
 *
 * 定义：
 * - talk_events = totalIssueContributions + totalPullRequestReviewContributions
 * - code_events = totalCommitContributions + totalPullRequestContributions + totalRepositoryContributions
 * - sample_size = talk_events + code_events
 * - value = talk_events / sample_size
 *
 * 设计取向：
 * - 不试图区分“好 / 坏”行为，只是刻画 “说话 / 协作” vs “写码” 的风格；
 * - restrictedContributionsCount 暂不计入分子 / 分母（GitHub 无法拆分其中的 talk/code）。
 */
export function computeCommunityEngagement(
  contributions: ContributionsSummary | null | undefined,
): {
  value: number | null;
  talk_events: number;
  code_events: number;
  sample_size: number;
} {
  if (!contributions) {
    return { value: null, talk_events: 0, code_events: 0, sample_size: 0 };
  }

  const talk =
    (contributions.totalIssueContributions ?? 0) +
    (contributions.totalPullRequestReviewContributions ?? 0);
  const code =
    (contributions.totalCommitContributions ?? 0) +
    (contributions.totalPullRequestContributions ?? 0) +
    (contributions.totalRepositoryContributions ?? 0);

  const sampleSize = talk + code;
  if (sampleSize <= 0) {
    return { value: null, talk_events: talk, code_events: code, sample_size: 0 };
  }

  const value = talk / sampleSize;
  return { value, talk_events: talk, code_events: code, sample_size: sampleSize };
}

/**
 * 计算 Contribution Momentum（贡献动量 / 活跃加速度 v0）。
 *
 * 基于 contributions.contributionCalendar 的周维度数据，对比“最近一季”和“过去一整年”的节奏。
 *
 * 定义：
 * - year_total：按 contributionCalendar.weeks[*].contributionDays[*].contributionCount 求和；
 * - recent_quarter_total：取最近 12 周（或不足 12 周时取全部）的 contributionCount 总和；
 * - baseline_quarter = year_total / 4；
 * - value = recent_quarter_total / baseline_quarter；
 *
 * 返回值：
 * - 当缺少 contributions 或 year_total <= 0 时，value = null，recent_quarter_total / year_total 仍保留原始计数；
 * - status 用于粗粒度刻画当前动量：
 *   - "accelerating"：value > 1.5
 *   - "cooling_down"：value < 0.5 且 value >= 0.1
 *   - "steady"：0.8 <= value <= 1.2
 *   - "ghost"：value < 0.1（包括极低活跃 / 几乎停更），或 year_total = 0
 *   - "unknown"：无 contributions 数据（无法判断节奏）。
 */
export function computeContributionMomentum(
  contributions: ContributionsSummary | null | undefined,
): {
  value: number | null;
  recent_quarter_total: number;
  year_total: number;
  status: "accelerating" | "steady" | "cooling_down" | "ghost" | "unknown";
} {
  if (!contributions) {
    return {
      value: null,
      recent_quarter_total: 0,
      year_total: 0,
      status: "unknown",
    };
  }

  const weeks = contributions.contributionCalendar?.weeks ?? [];

  // 以日历中实际天数为准重新计算 year_total，避免 totalContributions 与细节不一致
  let yearTotalFromDays = 0;
  for (const week of weeks) {
    for (const day of week.contributionDays) {
      yearTotalFromDays += day.contributionCount ?? 0;
    }
  }

  const yearTotal =
    yearTotalFromDays > 0
      ? yearTotalFromDays
      : contributions.contributionCalendar.totalContributions ?? 0;

  // 计算最近约一季（最多 12 周）的总 contributions
  let recentTotal = 0;
  if (weeks.length > 0) {
    const recentWeeks = Math.min(12, weeks.length);
    for (let i = weeks.length - recentWeeks; i < weeks.length; i++) {
      const week = weeks[i]!;
      for (const day of week.contributionDays) {
        recentTotal += day.contributionCount ?? 0;
      }
    }
  }

  if (yearTotal <= 0) {
    // 完全无贡献：视为 ghost，但保留 recent/year 原始计数（通常都是 0）
    return {
      value: null,
      recent_quarter_total: recentTotal,
      year_total: yearTotal,
      status: "ghost",
    };
  }

  const baselineQuarter = yearTotal / 4;
  if (baselineQuarter <= 0) {
    return {
      value: null,
      recent_quarter_total: recentTotal,
      year_total: yearTotal,
      status: "ghost",
    };
  }

  const value = recentTotal / baselineQuarter;

  let status: "accelerating" | "steady" | "cooling_down" | "ghost" | "unknown";
  if (value < 0.1) {
    status = "ghost";
  } else if (value < 0.5) {
    status = "cooling_down";
  } else if (value > 1.5) {
    status = "accelerating";
  } else if (value >= 0.8 && value <= 1.2) {
    status = "steady";
  } else {
    // 介于 0.5-0.8 或 1.2-1.5 之间的“轻微变化”，也归为 steady，避免过拟合。
    status = "steady";
  }

  return {
    value,
    recent_quarter_total: recentTotal,
    year_total: yearTotal,
    status,
  };
}




/**
 * 计算代表作（Top Repos）
 *
 * 基于 star 数和活跃度，对仓库进行评分和排序。
 *
 * 过滤规则：
 * - 排除可能为空的仓库（无语言、无 star、无 fork、无代码）
 * - 排除已归档的仓库
 */
export function computeTopRepos(repos: RepoRecord[], now: Date = new Date()) {
  const yearMs = 365 * 24 * 60 * 60 * 1000;

  return repos
    .filter((repo) => {
      // 过滤掉可能为空的仓库：
      // 1. 没有主要语言
      // 2. 没有任何语言数据（languages.edges 为空或不存在）
      // 3. 没有 star 和 fork
      const hasLanguage = repo.primaryLanguage?.name != null;
      const hasLanguageData = repo.languages?.edges && repo.languages.edges.length > 0;
      const hasStars = (repo.stargazerCount ?? 0) > 0;
      const hasForks = (repo.forkCount ?? 0) > 0;
      const isArchived = repo.isArchived ?? false;

      // 如果仓库既没有语言数据，又没有 star 和 fork，很可能是空仓库
      const isEmpty = !hasLanguage && !hasLanguageData && !hasStars && !hasForks;

      // 排除空仓库和已归档的仓库
      return !isEmpty && !isArchived;
    })
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
 */
export function buildTimezone(
  tzOverride: string | null | undefined,
  tzOffsetMinutes: number
): { auto: string | null; override: string | null; used: string | null } {
  const override = tzOverride ?? null;
  const usedOffset = override ? tzOffsetMinutes : 0;
  const usedStr = formatOffset(usedOffset);

  return {
    auto: "+00:00", // MVP 版本暂未实现自动推断，固定为 UTC
    override,
    used: usedStr
  };
}

/**
 * 构建证据样本
 *
 * 提取前 5 个 PR 和前 5 个仓库的 URL，作为 AI 生成具体案例的证据。
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
 * 工具函数：将小时（0-23）格式化为 "HH:00" 字符串。
 */
export function formatHour(h: number): string {
  const hh = h.toString().padStart(2, "0");
  return `${hh}:00`;
}

/**
 * 工具函数：将分钟偏移格式化为 "+HH:MM" / "-HH:MM" 字符串。
 */
export function formatOffset(minutes: number): string {
  const sign = minutes < 0 ? "-" : "+";
  const abs = Math.abs(minutes);
  const h = Math.floor(abs / 60)
    .toString()
    .padStart(2, "0");
  const m = (abs % 60).toString().padStart(2, "0");
  return `${sign}${h}:${m}`;
}
