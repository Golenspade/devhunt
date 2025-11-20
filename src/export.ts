/**
 * 报告导出模块
 *
 * 负责读取原始数据、执行分析、生成图表，并导出最终的画像报告。
 *
 * 设计理念：
 * - 读取 scan 阶段生成的原始 JSONL 文件
 * - 调用 analyze 模块计算各项指标
 * - 调用 charts 模块生成可视化图表
 * - 输出结构化 JSON 和 SVG 图表，供 AI 或人类阅读
 *
 * 参考文档：
 * - mvp.md 中的 report 命令定义
 * - pod.md 中的"骨架+图表"输出理念
 * - CHANGELOG.md v0.0.2 中的报告生成流程
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { analyzeAll, computeTopRepos } from "./analyze";
import type { RepoRecord, PRRecord, UserInfo, CommitRecord } from "./analyze";
import type { ContributionsSummary } from "./types/github";

import { renderLanguagesChart, renderHoursChart } from "./charts";
import { AnalysisError } from "./errors";

/**
 * 报告生成选项
 */
export interface ReportOptions {
  /** GitHub 用户名 */
  login: string;
  /** 时区覆盖参数（用于本地化时间分析） */
  tzOverride?: string | null;
  /** 输出目录（默认为 out/<login>） */
  outDir?: string;
}

/**
 * 生成用户画像报告
 *
 * 这是 `bun devhunt report` 命令的核心实现。
 *
 * 执行流程：
 * 1. 读取原始数据（repos.jsonl / prs.jsonl / profile_readme.md）
 * 2. 调用分析模块计算画像指标
 * 3. 生成可视化图表（languages.svg / hours.svg）
 * 4. 导出结构化报告（profile.json / top_repos.json）
 *
 * @param options - 报告生成选项
 * @throws {AnalysisError} 当分析或文件写入失败时
 *
 * @example
 * ```typescript
 * await reportUser({
 *   login: "torvalds",
 *   tzOverride: "Europe/Helsinki",
 *   outDir: "out/torvalds"
 * });
 * ```
 *
 * 输出文件：
 * - out/<login>/profile.json: 开发者画像骨架（给 AI 读的结构化数据）
 * - out/<login>/top_repos.json: Top 仓库列表及评分
 * - out/<login>/charts/languages.svg: 语言分布图
 * - out/<login>/charts/hours.svg: 活跃时段分布图
 *
 * 设计理念（参考 pod.md）：
 * - 我们只产出"骨架+图表"，AI 负责写"结论/分析/亮点/总评"
 * - 所有数据都可回溯到原始证据（repos/PRs/commits）
 * - 不做价值判断，只给事实和证据
 */
export async function reportUser(options: ReportOptions): Promise<void> {
  const { login } = options;
  const baseOut = options.outDir ?? join("out", login);
  const rawDir = join(baseOut, "raw");
  const chartsDir = join(baseOut, "charts");

  console.log(`[devhunt] Generating report for ${login}...`);
  console.log(`[devhunt] Reading raw data from ${rawDir}`);

  // 并行读取所有原始数据文件
  const [repos, prs, commits, profileReadmeMarkdown, userInfo, contributions] = await Promise.all([
    readJsonl<RepoRecord>(join(rawDir, "repos.jsonl")),
    readJsonl<PRRecord>(join(rawDir, "prs.jsonl")),
    readJsonl<CommitRecord>(join(rawDir, "commits.jsonl")),
    readOptionalText(join(rawDir, "profile_readme.md")),
    readOptionalJson<UserInfo>(join(rawDir, "user_info.json")), // v0.0.10: 读取用户信息
    readOptionalJson<ContributionsSummary>(join(rawDir, "contributions.json"))
  ]);

  // 打印数据加载情况
  console.log(
    `[devhunt] Loaded ${repos.length} repositories, ${prs.length} pull requests, ${commits.length} commits`,
  );
  if (profileReadmeMarkdown && profileReadmeMarkdown.trim().length > 0) {
    console.log("[devhunt] Profile README: found and loaded");
  } else if (profileReadmeMarkdown === "") {
    console.log("[devhunt] Profile README: file exists but is empty");
  } else {
    console.log("[devhunt] Profile README: not found");
  }
  // v0.0.10: 打印用户信息加载情况
  if (userInfo) {
    console.log("[devhunt] User info: found and loaded");
  } else {
    console.log("[devhunt] User info: not found (may be from older scan)");
  }

  // 检查是否有数据（如果没有，可能是用户忘记先运行 scan）
  if (repos.length === 0 && prs.length === 0) {
    console.warn("[devhunt] Warning: no raw data found; did you run 'bun devhunt scan' first?");
  }

  // 执行分析和计算
  let analysis: ReturnType<typeof analyzeAll>;
  let topRepos: ReturnType<typeof computeTopRepos>;
  try {
    analysis = analyzeAll({
      login,
      repos,
      prs,
      commits,
      contributions,
      tzOverride: options.tzOverride,
      profileReadmeMarkdown,
      userInfo // v0.0.10: 传递用户信息
    });
    topRepos = computeTopRepos(repos);
  } catch (err) {
    throw new AnalysisError(
      `Failed to analyze data for ${login}: ${(err as Error).message}`,
      err
    );
  }

  await mkdir(baseOut, { recursive: true });
  console.log(`[devhunt] Writing profile.json and top_repos.json to ${baseOut}`);

  // 并行写入所有输出文件和生成图表
  try {
    await Promise.all([
      writeFile(join(baseOut, "profile.json"), JSON.stringify(analysis.profile, null, 2), "utf8"),
      writeFile(join(baseOut, "top_repos.json"), JSON.stringify(topRepos, null, 2), "utf8"),
      renderLanguagesChart(chartsDir, analysis.profile.skills),
      renderHoursChart(chartsDir, analysis.hoursHistogram.map((v) => v ?? 0))
    ]);
  } catch (err) {
    throw new AnalysisError(
      `Failed to generate charts or write report files: ${(err as Error).message}`,
      err
    );
  }

  // 打印输出文件清单
  console.log("[devhunt] Report artifacts:");
  console.log(`  - ${join(baseOut, "profile.json")}`);
  console.log(`  - ${join(baseOut, "top_repos.json")}`);
  console.log(`  - ${join(chartsDir, "languages.svg")}`);
  console.log(`  - ${join(chartsDir, "hours.svg")}`);
  console.log("[devhunt] Report complete.");
}

/**
 * 读取可选的文本文件
 *
 * 如果文件不存在，返回 null 而不抛出错误。
 * 用于读取可能不存在的 profile README。
 *
 * @param path - 文件路径
 * @returns 文件内容字符串，或 null（文件不存在时）
 * @throws 当文件存在但读取失败时（如权限问题）
 */
async function readOptionalText(path: string): Promise<string | null> {
  try {
    const text = await readFile(path, "utf8");
    return text;
  } catch (err: any) {
    if (err && err.code === "ENOENT") {
      // 文件不存在，返回 null
      return null;
    }
    // 其他错误（如权限问题）继续抛出
    throw err;
  }
}

/**
 * 读取可选的 JSON 文件
 *
 * 如果文件不存在，返回 null 而不抛出错误。
 * 用于读取可能不存在的用户信息文件（v0.0.10 新增）。
 *
 * @template T - JSON 对象的类型
 * @param path - JSON 文件路径
 * @returns 解析后的对象，或 null（文件不存在时）
 * @throws 当文件存在但解析失败时（如 JSON 格式错误）
 */
async function readOptionalJson<T>(path: string): Promise<T | null> {
  try {
    const text = await readFile(path, "utf8");
    return JSON.parse(text) as T;
  } catch (err: any) {
    if (err && err.code === "ENOENT") {
      // 文件不存在，返回 null
      return null;
    }
    // 其他错误（如 JSON 解析错误）继续抛出
    throw err;
  }
}

/**
 * 读取 JSONL 文件
 *
 * JSONL（JSON Lines）格式：每行一个 JSON 对象。
 * 如果文件不存在，返回空数组而不抛出错误。
 *
 * @template T - JSON 对象的类型
 * @param path - JSONL 文件路径
 * @returns 解析后的对象数组
 * @throws 当文件存在但解析失败时（如 JSON 格式错误）
 *
 * 技术细节：
 * - 使用 /\r?\n/ 正则分割行（兼容 Windows 和 Unix 换行符）
 * - filter(Boolean) 过滤空行
 * - 每行独立解析为 JSON 对象
 */
async function readJsonl<T>(path: string): Promise<T[]> {
  try {
    const text = await readFile(path, "utf8");
    const lines = text.split(/\r?\n/).filter(Boolean);
    return lines.map((line) => JSON.parse(line) as T);
  } catch (err: any) {
    if (err && err.code === "ENOENT") {
      // 文件不存在，返回空数组
      return [];
    }
    // 其他错误（如 JSON 解析错误）继续抛出
    throw err;
  }
}

