import type { RepoRecord, PRRecord } from "../types/github";

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
 * 计算代表作（Top Repos）
 *
 * 基于 star 数和活跃度，对仓库进行评分和排序。
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
