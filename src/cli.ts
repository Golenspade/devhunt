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

  /**
   * AI 导读语言
   *
   * 用于 narrate 命令，指定导读输出的语言。
   * 可选值：zh（中文）、en（英文）
   */
  lang?: "zh" | "en";

  /**
   * AI 导读风格
   *
   * 用于 narrate 命令，指定导读的风格。
   * 可选值：professional（专业）、casual（轻松）、brief（简短）
   */
  style?: "professional" | "casual" | "brief";
}

/**
 * 验证 GitHub 用户名，防止路径遍历攻击
 *
 * @param login - GitHub 用户名
 * @returns 如果有效返回 true，否则抛出错误
 */
function validateLogin(login: string): void {
  if (!login || login.trim().length === 0) {
    throw new Error("GitHub 用户名不能为空");
  }

  // 检查路径遍历字符
  if (login.includes("..") || login.includes("/") || login.includes("\\")) {
    throw new Error(`无效的 GitHub 用户名: "${login}"。用户名不能包含路径遍历字符 (../, /, \\)`);
  }

  // 检查其他危险字符
  const dangerousChars = /[<>:"|?*\x00-\x1f]/;
  if (dangerousChars.test(login)) {
    throw new Error(`无效的 GitHub 用户名: "${login}"。用户名包含非法字符`);
  }

  // GitHub 用户名长度限制（最多 39 个字符）
  if (login.length > 39) {
    throw new Error(`无效的 GitHub 用户名: "${login}"。用户名长度不能超过 39 个字符`);
  }
}

/**
 * 验证时间窗口选项
 *
 * @param window - 时间窗口字符串
 * @returns 如果有效返回 true，否则抛出错误
 */
function validateWindow(window: string): void {
  const validWindows: string[] = ["quarter", "half", "year", "3y", "all"];
  if (!validWindows.includes(window)) {
    throw new Error(
      `无效的时间窗口选项: "${window}"。有效选项: ${validWindows.join(", ")}`
    );
  }
}

/**
 * 验证语言选项
 *
 * @param lang - 语言字符串
 * @returns 如果有效返回 true，否则抛出错误
 */
function validateLang(lang: string): void {
  const validLangs: string[] = ["zh", "en"];
  if (!validLangs.includes(lang)) {
    throw new Error(`无效的语言选项: "${lang}"。有效选项: ${validLangs.join(", ")}`);
  }
}

/**
 * 验证风格选项
 *
 * @param style - 风格字符串
 * @returns 如果有效返回 true，否则抛出错误
 */
function validateStyle(style: string): void {
  const validStyles: string[] = ["professional", "casual", "brief"];
  if (!validStyles.includes(style)) {
    throw new Error(
      `无效的风格选项: "${style}"。有效选项: ${validStyles.join(", ")}`
    );
  }
}

/**
 * 验证时区字符串格式
 *
 * @param tz - 时区字符串
 * @returns 如果有效返回 true，否则抛出错误
 */
function validateTimezone(tz: string): void {
  if (!tz || tz.trim().length === 0) {
    throw new Error("时区参数不能为空");
  }

  // 检查路径遍历字符（但允许 IANA 时区格式中的 /）
  if (tz.includes("..") || tz.includes("\\")) {
    throw new Error(`无效的时区格式: "${tz}"。时区不能包含路径遍历字符`);
  }

  // 检查 SQL 注入尝试（基本检查）
  const sqlInjectionPattern = /['";]|--|\/\*|\*\/|DROP|TABLE|DELETE|INSERT|UPDATE|SELECT/i;
  if (sqlInjectionPattern.test(tz)) {
    throw new Error(`无效的时区格式: "${tz}"。时区包含非法字符`);
  }

  // 验证 IANA 时区格式（如 Asia/Shanghai, America/New_York）或偏移量格式（如 +08:00）
  // IANA 时区格式：Continent/City 或 Region/City，可能包含下划线和连字符
  const ianaPattern = /^[A-Za-z_]+\/[A-Za-z_]+(\/[A-Za-z_]+)?$/;
  const offsetPattern = /^[+-]\d{2}:\d{2}$/;
  
  // 如果包含 /，必须是有效的 IANA 格式
  if (tz.includes("/")) {
    if (!ianaPattern.test(tz)) {
      throw new Error(`无效的时区格式: "${tz}"。IANA 时区格式应为 Continent/City（如 "Asia/Shanghai"）`);
    }
  } else if (!offsetPattern.test(tz)) {
    // 不包含 / 且不是偏移量格式，记录警告但允许（可能是 UTC、GMT 等）
    console.warn(`[devhunt] 警告: 时区格式 "${tz}" 可能无效。建议使用 IANA 时区名称（如 "Asia/Shanghai"）或偏移量格式（如 "+08:00"）`);
  }
}

/**
 * 解析命令行参数
 *
 * 从 argv 数组中提取子命令、用户名和选项参数。
 * 包含完整的安全验证和边界检查。
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
 * - narrate: 生成 AI 导读
 */
export function parseArgs(
  argv: string[]
): { cmd?: string; login?: string; options: CLIOptions } {

  const [cmd, login, ...rest] = argv;
  const options: CLIOptions = {};
  
  // 验证 login 参数（如果存在）
  if (login) {
    try {
      validateLogin(login);
    } catch (err) {
      throw err;
    }
  }

  // 跟踪已设置的参数，用于检测重复
  const seenParams = new Set<string>();
  const unknownParams: string[] = [];

  // 遍历剩余参数，提取选项值
  for (let i = 0; i < rest.length; i++) {
    const arg = rest[i];
    if (!arg) {
      continue;
    }
    
    if (arg === "--token") {
      if (seenParams.has("token")) {
        console.warn("[devhunt] 警告: --token 参数被多次指定，将使用最后一个值");
      }
      seenParams.add("token");
      
      // 检查参数值是否存在
      const value = rest[i + 1];
      if (typeof value !== "string") {
        throw new Error("--token 参数缺少值");
      }
      
      i += 1;
      // 拒绝空字符串
      if (value === "") {
        throw new Error("--token 参数值不能为空");
      }
      options.token = value;
      
    } else if (arg === "--tz") {
      if (seenParams.has("tz")) {
        console.warn("[devhunt] 警告: --tz 参数被多次指定，将使用最后一个值");
      }
      seenParams.add("tz");
      
      // 检查参数值是否存在
      const value = rest[i + 1];
      if (typeof value !== "string") {
        throw new Error("--tz 参数缺少值");
      }
      
      i += 1;
      // 拒绝空字符串
      if (value === "") {
        throw new Error("--tz 参数值不能为空");
      }
      
      // 验证时区格式
      try {
        validateTimezone(value);
        options.tz = value;
      } catch (err) {
        throw err;
      }
      
    } else if (arg === "--window") {
      if (seenParams.has("window")) {
        console.warn("[devhunt] 警告: --window 参数被多次指定，将使用最后一个值");
      }
      seenParams.add("window");
      
      // 检查参数值是否存在
      const value = rest[i + 1];
      if (typeof value !== "string") {
        throw new Error("--window 参数缺少值");
      }
      
      i += 1;
      // 拒绝空字符串
      if (value === "") {
        throw new Error("--window 参数值不能为空");
      }
      
      // 验证时间窗口选项
      try {
        validateWindow(value);
        options.window = value;
      } catch (err) {
        throw err;
      }
      
    } else if (arg === "--yes" || arg === "-y") {
      if (seenParams.has("yes")) {
        console.warn("[devhunt] 警告: --yes/-y 参数被多次指定");
      }
      seenParams.add("yes");
      options.yes = true;
      
    } else if (arg === "--lang") {
      if (seenParams.has("lang")) {
        console.warn("[devhunt] 警告: --lang 参数被多次指定，将使用最后一个值");
      }
      seenParams.add("lang");
      
      // 检查参数值是否存在
      const value = rest[i + 1];
      if (typeof value !== "string") {
        throw new Error("--lang 参数缺少值");
      }
      
      i += 1;
      // 拒绝空字符串
      if (value === "") {
        throw new Error("--lang 参数值不能为空");
      }
      
      // 验证语言选项
      try {
        validateLang(value);
        options.lang = value as "zh" | "en";
      } catch (err) {
        throw err;
      }
      
    } else if (arg === "--style") {
      if (seenParams.has("style")) {
        console.warn("[devhunt] 警告: --style 参数被多次指定，将使用最后一个值");
      }
      seenParams.add("style");
      
      // 检查参数值是否存在
      const value = rest[i + 1];
      if (typeof value !== "string") {
        throw new Error("--style 参数缺少值");
      }
      
      i += 1;
      // 拒绝空字符串
      if (value === "") {
        throw new Error("--style 参数值不能为空");
      }
      
      // 验证风格选项
      try {
        validateStyle(value);
        options.style = value as "professional" | "casual" | "brief";
      } catch (err) {
        throw err;
      }
      
    } else if (arg.startsWith("--")) {
      // 未知的长参数
      unknownParams.push(arg);
    } else if (arg.startsWith("-") && arg !== "-y") {
      // 未知的短参数（-y 已处理）
      unknownParams.push(arg);
    }
  }

  // 警告未知参数
  if (unknownParams.length > 0) {
    console.warn(`[devhunt] 警告: 检测到未知参数: ${unknownParams.join(", ")}。这些参数将被忽略。`);
  }

  return { cmd, login, options };
}

