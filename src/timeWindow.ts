/**
 * 时间窗口选项类型
 *
 * 定义了 scan 命令支持的所有时间窗口选项。
 * 用于控制 commit 拉取的时间范围。
 *
 * 参考文档：
 * - docs/cli-params.md 中的 --window 参数说明
 * - CHANGELOG.md v0.0.4 中的时间窗口功能
 */
export type TimeWindowOption = "quarter" | "half" | "year" | "3y" | "all";

/**
 * 解析时间窗口选项，计算 commit 拉取的起始时间
 *
 * 根据时间窗口选项计算一个 ISO 8601 格式的时间戳，
 * 用于 GitHub GraphQL API 的 `since` 参数，限制 commit 拉取范围。
 *
 * @param windowOpt - 时间窗口选项字符串（来自 --window 参数）
 * @param now - 当前时间（默认为 new Date()，主要用于测试）
 * @returns ISO 8601 格式的起始时间字符串，或 null（表示不限制时间）
 *
 * @example
 * ```typescript
 * // 假设当前时间为 2025-01-17
 * resolveSince("quarter")  // => "2024-10-19T00:00:00.000Z" (90天前)
 * resolveSince("half")     // => "2024-07-19T00:00:00.000Z" (182天前)
 * resolveSince("year")     // => "2024-01-17T00:00:00.000Z" (365天前)
 * resolveSince("3y")       // => "2022-01-17T00:00:00.000Z" (3年前)
 * resolveSince("all")      // => null (不限制时间)
 * resolveSince(undefined)  // => "2024-01-17T00:00:00.000Z" (默认为 year)
 * ```
 *
 * 设计理念：
 * - 默认值为 "year"（最近一年），平衡数据量和分析价值
 * - "all" 选项支持"以人为本 & 全史视角"（参考 pod.md）
 * - 时间窗口只影响 commit 拉取，repos 和 PRs 始终全量拉取
 * - 这样设计是因为 commit 数据量可能很大，而 repos/PRs 相对较少
 */
export function resolveSince(windowOpt?: string, now: Date = new Date()): string | null {
  const dayMs = 24 * 60 * 60 * 1000;

  // 默认使用 "year"
  const key = (windowOpt as TimeWindowOption | undefined) ?? "year";

  // "all" 表示不限制时间，返回 null
  if (key === "all") {
    return null;
  }

  // 根据选项计算天数
  let days: number;
  switch (key) {
    case "quarter":
      days = 90;   // 约 1 个季度
      break;
    case "half":
      days = 182;  // 约半年
      break;
    case "3y":
      days = 365 * 3;  // 3 年
      break;
    case "year":
    default:
      days = 365;  // 1 年（默认）
      break;
  }

  // 计算起始时间并转为 ISO 8601 格式
  const since = new Date(now.getTime() - days * dayMs);
  return since.toISOString();
}

