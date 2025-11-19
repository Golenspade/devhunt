/**
 * CLI 命令行选项接口
 *
 * 定义了 devhunt CLI 工具支持的所有命令行参数。
 * 参考文档：docs/cli-params.md
 */
export interface CLIOptions {
  /**
   * GitHub Personal Access Token
   *
   * 用于调用 GitHub GraphQL API 的访问令牌。
   * 优先级：
   * 1. 命令行参数 --token
   * 2. 环境变量 GITHUB_TOKEN
   * 3. 环境变量 GH_TOKEN
   *
   * 建议使用 Fine-grained Personal Access Token，只需公开仓库访问权限。
   */
  token?: string;

  /**
   * 时区覆盖参数
   *
   * 用于画像中涉及「本地化时间」的分析维度（如活跃时段分布）。
   * 支持 IANA 时区名称（如 "Asia/Shanghai"）或偏移量格式（如 "+08:00"）。
   *
   * 若不指定，则使用分析模块内置的默认/推断逻辑。
   */
  tz?: string;

  /**
   * Commit 拉取时间窗口
   *
   * 控制 commits.jsonl 中包含的 commit 范围。
   * 可选值：
   * - "quarter": 最近 1 个季度（约 90 天）
   * - "half": 最近半年（约 182 天）
   * - "year": 最近 1 年（365 天，默认值）
   * - "3y": 最近 3 年
   * - "all": 不限制时间，拉取全部历史
   *
   * 参考：mvp.md 中的"以人为本 & 全史视角"设计理念
   */
  window?: string;

  /**
   * 跳过用户确认
   *
   * 在扫描前跳过用户信息预览和确认步骤。
   * 适用于批量扫描或 CI 环境。
   *
   * 命令行参数：--yes 或 -y
   */
  yes?: boolean;
}

/**
 * 解析命令行参数
 *
 * 从 argv 数组中提取子命令、用户名和选项参数。
 *
 * @param argv - 命令行参数数组（通常来自 process.argv.slice(2)）
 * @returns 包含 cmd（子命令）、login（GitHub 用户名）和 options（选项对象）的对象
 *
 * @example
 * ```typescript
 * // 输入: ["scan", "torvalds", "--token", "ghp_xxx", "--window", "year"]
 * // 输出: { cmd: "scan", login: "torvalds", options: { token: "ghp_xxx", window: "year" } }
 * ```
 *
 * 支持的子命令：
 * - scan: 扫描指定 GitHub 用户，拉取原始数据（repos / PRs / commits）
 * - report: 基于已有原始数据生成画像报告和图表
 */
export function parseArgs(
  argv: string[]
): { cmd?: string; login?: string; options: CLIOptions } {
  const [cmd, login, ...rest] = argv;
  const options: CLIOptions = {};

  // 遍历剩余参数，提取选项值
  for (let i = 0; i < rest.length; i++) {
    const arg = rest[i];
    if (arg === "--token") {
      options.token = rest[++i];
    } else if (arg === "--tz") {
      options.tz = rest[++i];
    } else if (arg === "--window") {
      options.window = rest[++i];
    } else if (arg === "--yes" || arg === "-y") {
      options.yes = true;
    }
  }

  return { cmd, login, options };
}

