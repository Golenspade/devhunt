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

import type { RepoRecord, PRRecord, UserInfo, CommitRecord } from "./types/github";
import type {
  ProfileReadmeStyle,
  ProfileReadmeAnalysis,
  ConsistencySignals,
  ProfileJSON,
  AnalysisResult,
  AnalyzeOptions
} from "./types/profile";

export type {
  RepoRecord,
  PRRecord,
  UserInfo,
  CommitRecord,
  ProfileReadmeStyle,
  ProfileReadmeAnalysis,
  ConsistencySignals,
  ProfileJSON,
  AnalysisResult,
  AnalyzeOptions
};










import {
  computeLanguageWeights as _computeLanguageWeights,
  computeLanguageWeightsV2 as _computeLanguageWeightsV2,
  computeTopicWeights as _computeTopicWeights,
  computeHoursHistogram as _computeHoursHistogram,
  computeCoreHours as _computeCoreHours,
  computeUoi as _computeUoi,
  computeExternalPrAcceptRate as _computeExternalPrAcceptRate,
  computeTopRepos as _computeTopRepos,
  computeNightRatio as _computeNightRatio,
  computeFocusRatio as _computeFocusRatio,
  parseTimezoneOffset as _parseTimezoneOffset,
  buildTimezone as _buildTimezone,
  buildSummaryEvidence as _buildSummaryEvidence
} from "./analysis/metrics";
import {
  analyzeProfileReadme as _analyzeProfileReadme,
  computeReadmeConsistency as _computeReadmeConsistency
} from "./analysis/nlp";
import { analyzeAll as _analyzeAll } from "./analysis";


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
  // 委托给模块化实现（src/analysis/index.ts），保持对外 API 不变
  return _analyzeAll(options);
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
  return _computeLanguageWeights(repos);
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
  return _computeLanguageWeightsV2(repos);
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
  return _computeTopicWeights(repos);
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
  return _computeHoursHistogram(prs, tzOffsetMinutes);
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
  return _computeCoreHours(hist);
}

/**
 * 计算 Night Ratio（熬夜率）。
 *
 * - 仅使用 commit.authoredAt 作为“写代码时间”的代理；
 * - 排除 merge commit（isMerge=true），避免一键合并/CI 噪声；
 * - 使用与 PR hours 相同的 tzOffsetMinutes，将 UTC 时间转换为本地小时后判断是否属于夜间窗口。
 *
 * 夜间窗口 v0 约定为当地时间 [22:00, 04:00]，即小时桶 {22, 23, 0, 1, 2, 3, 4}。
 *
 * @param commits - Commit 列表（可选）。
 * @param tzOffsetMinutes - 时区偏移量（分钟）。
 * @returns { value, sample_size }，若 sample_size=0，则 value 为 null。
 */
export function computeNightRatio(
  commits: CommitRecord[] | undefined,
  tzOffsetMinutes: number
): { value: number | null; sample_size: number } {
  return _computeNightRatio(commits, tzOffsetMinutes);
}

/**
 * 计算 Focus Ratio（专注率）。
 *
 * - 基于 repos.languages.edges.size（原始 bytes），不做 star 加权；
 * - 汇总所有仓库的语言 bytes 后，计算 Top1 语言 bytes / 总 bytes；
 * - 用于刻画“工作量是否主要集中在单一语言栈”。
 *
 * @param repos - 仓库列表。
 * @returns { value, sample_size }，value 为 0-1 的比例；若无语言 bytes 数据则 value 为 null，sample_size=0。
 */
export function computeFocusRatio(
  repos: RepoRecord[]
): { value: number | null; sample_size: number } {
  return _computeFocusRatio(repos);
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
  return _computeUoi(prs, login);
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
  return _computeExternalPrAcceptRate(prs, login);
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
  return _computeTopRepos(repos, now);
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
  return _parseTimezoneOffset(tz);
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
  return _buildTimezone(tzOverride, tzOffsetMinutes);
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
  return _buildSummaryEvidence(_login, repos, prs);
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
  return _analyzeProfileReadme(markdown);
}



/**
 * 从 Profile README 中提取技术栈/主题关键词
 *
 * v0.0.9 新增：提取 README 中提到的常见技术栈关键词（如 "react", "docker", "kubernetes"）。
 *
 * 算法：
 * 1. 从 README 的纯文本和图片 alt 文本中提取文本


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
  return _computeReadmeConsistency(readme, skills, login, repos);
}

