/**
 * Devhunt 错误类型枚举
 *
 * 定义了 devhunt 工具中所有可能的错误分类。
 * 这些分类用于在 CLI 中提供更精确的错误提示和可操作建议。
 *
 * 参考文档：CHANGELOG.md v0.0.2 中的错误处理改进
 */
export type DevhuntErrorKind =
  | "network"    // 网络错误：无法访问 GitHub API、代理问题、超时等
  | "auth"       // 认证错误：Token 缺失/无效/过期/权限不足
  | "not_found"  // 目标不存在：用户不存在或不可访问
  | "analysis"   // 分析错误：本地依赖缺失、分析代码异常
  | "cli"        // CLI 环境错误：gh CLI 不可用等
  | "unknown";   // 未知错误

/**
 * Devhunt 基础错误类
 *
 * 所有 devhunt 特定错误的基类，提供统一的错误分类和详情存储。
 *
 * @property kind - 错误类型分类，用于错误处理分支
 * @property details - 可选的错误详情对象，用于调试和日志记录
 */
export class DevhuntError extends Error {
  readonly kind: DevhuntErrorKind;
  readonly details?: unknown;

  /**
   * @param kind - 错误类型
   * @param message - 错误消息（面向用户的描述）
   * @param details - 可选的错误详情（如 HTTP 状态码、原始响应等）
   */
  constructor(kind: DevhuntErrorKind, message: string, details?: unknown) {
    super(message);
    this.name = "DevhuntError";
    this.kind = kind;
    this.details = details;
  }
}

/**
 * GitHub 网络错误
 *
 * 当无法访问 GitHub API 时抛出，可能的原因包括：
 * - 网络连接问题（DNS 解析失败、连接超时）
 * - 代理配置问题
 * - TLS 握手失败
 * - GitHub 服务不可用
 *
 * 用户建议：检查网络连接、代理设置、防火墙配置
 */
export class GitHubNetworkError extends DevhuntError {
  constructor(message: string, details?: unknown) {
    super("network", message, details);
    this.name = "GitHubNetworkError";
  }
}

/**
 * GitHub 认证错误
 *
 * 当 GitHub API 认证失败时抛出，可能的原因包括：
 * - Token 未配置（未传递 --token 参数且环境变量未设置）
 * - Token 无效或已过期
 * - Token 权限不足（如缺少访问公开仓库的权限）
 * - API 速率限制超出（rate limit exceeded）
 *
 * 用户建议：
 * 1. 检查 GITHUB_TOKEN 或 GH_TOKEN 环境变量
 * 2. 使用 --token 参数传递有效的 Personal Access Token
 * 3. 确保 Token 具有访问公开仓库的权限
 * 4. 如遇速率限制，等待一段时间后重试
 */
export class GitHubAuthError extends DevhuntError {
  constructor(message: string, details?: unknown) {
    super("auth", message, details);
    this.name = "GitHubAuthError";
  }
}

/**
 * GitHub 目标不存在错误
 *
 * 当指定的 GitHub 用户不存在或不可访问时抛出。
 * 可能的原因包括：
 * - 用户名拼写错误
 * - 用户账号已被删除或暂停
 * - 用户设置了隐私限制，当前 Token 无权访问
 *
 * 用户建议：
 * 1. 检查用户名拼写是否正确
 * 2. 在 GitHub 网站上确认该用户是否存在
 * 3. 确认该用户的隐私设置允许公开访问
 */
export class GitHubNotFoundError extends DevhuntError {
  constructor(message: string, details?: unknown) {
    super("not_found", message, details);
    this.name = "GitHubNotFoundError";
  }
}

/**
 * CLI 环境错误
 *
 * 当本地 CLI 环境不满足运行条件时抛出。
 * 可能的原因包括：
 * - GitHub CLI (gh) 未安装或不在 PATH 中
 * - gh CLI 版本过低
 * - gh CLI 配置异常
 *
 * 用户建议：
 * 1. 安装 GitHub CLI: https://cli.github.com/
 * 2. 确保 gh 命令在 PATH 中可用
 * 3. 运行 `gh auth login` 进行认证
 */
export class CliError extends DevhuntError {
  constructor(message: string, details?: unknown) {
    super("cli", message, details);
    this.name = "CliError";
  }
}

/**
 * 分析错误
 *
 * 当数据分析或报告生成过程中出错时抛出。
 * 可能的原因包括：
 * - 本地依赖缺失（如 Vega-Lite 渲染库）
 * - 原始数据格式异常或损坏
 * - 分析代码内部异常（如除零错误、空指针等）
 * - 文件系统权限问题（无法写入输出目录）
 *
 * 用户建议：
 * 1. 确保已运行 `bun install` 安装所有依赖
 * 2. 检查 out/<login>/raw/ 目录下的原始数据是否完整
 * 3. 确保输出目录有写入权限
 * 4. 如问题持续，请提交 issue 并附上错误详情
 */
export class AnalysisError extends DevhuntError {
  constructor(message: string, details?: unknown) {
    super("analysis", message, details);
    this.name = "AnalysisError";
  }
}

