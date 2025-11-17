/**
 * GitHub GraphQL 客户端模块
 *
 * 提供对 GitHub CLI (gh) 的薄封装，用于执行 GraphQL 查询。
 *
 * 设计理念：
 * - 依赖 gh CLI 而非直接调用 HTTP API，利用 gh 的认证和配置管理
 * - 从 .graphql 文件读取查询，保持查询和代码分离
 * - 提供详细的错误分类，便于 CLI 给出精确的用户提示
 *
 * 参考文档：
 * - mvp.md 中的技术栈选择（使用 gh CLI 做认证与 GraphQL 调用）
 * - CHANGELOG.md v0.0.2 中的错误处理改进
 */

import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { CliError, GitHubAuthError, GitHubNetworkError, GitHubNotFoundError } from "./errors";

/**
 * GitHub 客户端选项
 */
export interface GitHubClientOptions {
  /**
   * GitHub Personal Access Token
   *
   * 如果提供，将覆盖环境变量中的 Token。
   * 优先级：options.token > GITHUB_TOKEN > GH_TOKEN
   */
  token?: string | null;
}

/**
 * GitHub GraphQL API 响应格式
 *
 * @template T - 响应数据的类型
 */
interface GraphQLResponse<T> {
  /** 查询结果数据 */
  data?: T;
  /** GraphQL 错误列表（如果有） */
  errors?: { message: string }[];
}

/**
 * 从 .graphql 文件执行 GitHub GraphQL 查询
 *
 * 这是对 `gh api graphql` 命令的薄封装，提供以下功能：
 * 1. 从文件读取 GraphQL 查询语句
 * 2. 通过 -F 参数传递标量变量
 * 3. 自动处理 Token 认证（优先级：参数 > GITHUB_TOKEN > GH_TOKEN）
 * 4. 详细的错误分类和处理
 *
 * @template T - 期望的响应数据类型
 * @param queryFilePath - .graphql 查询文件的路径
 * @param variables - GraphQL 查询变量（键值对）
 * @param options - 客户端选项（如 Token）
 * @returns 解析后的响应数据
 * @throws {CliError} 当 gh CLI 不可用时
 * @throws {GitHubNetworkError} 当网络错误或 gh 命令执行失败时
 * @throws {GitHubAuthError} 当认证失败或权限不足时
 * @throws {GitHubNotFoundError} 当查询的资源不存在时
 *
 * @example
 * ```typescript
 * interface UserData {
 *   user: { login: string; name: string };
 * }
 *
 * const data = await graphqlFromFile<UserData>(
 *   "./queries/user.graphql",
 *   { login: "torvalds" },
 *   { token: "ghp_xxx" }
 * );
 * console.log(data.user.name);
 * ```
 *
 * 技术细节：
 * - 使用同步的 spawnSync 而非异步 spawn，简化错误处理
 * - 通过环境变量传递 Token，避免在命令行参数中暴露
 * - 支持 null/undefined 变量值（自动跳过）
 */
export async function graphqlFromFile<T>(
  queryFilePath: string,
  variables: Record<string, string | number | boolean | null | undefined>,
  options: GitHubClientOptions = {}
): Promise<T> {
  // 准备环境变量（用于传递 Token）
  const env = { ...process.env } as Record<string, string>;

  // Token 优先级：options.token > GITHUB_TOKEN > GH_TOKEN
  const token = options.token ?? process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN ?? null;
  if (token) {
    env.GITHUB_TOKEN = token;
  }

  // 从文件读取 GraphQL 查询
  const query = readFileSync(queryFilePath, "utf8");

  // 构建 gh 命令参数
  const args: string[] = ["api", "graphql", "-f", `query=${query}`];

  // 添加 GraphQL 变量（通过 -F 参数传递）
  for (const [key, value] of Object.entries(variables)) {
    if (value === undefined || value === null) continue;
    args.push("-F", `${key}=${value}`);
  }

  // 执行 gh 命令
  const result = spawnSync("gh", args, {
    encoding: "utf8",
    env
  });

  // 处理进程执行错误
  if (result.error) {
    const anyErr = result.error as any;
    // ENOENT 表示命令不存在（gh 未安装或不在 PATH 中）
    if (anyErr && anyErr.code === "ENOENT") {
      throw new CliError('GitHub CLI "gh" not found in PATH. Please install GitHub CLI.');
    }
    throw new GitHubNetworkError(`Failed to run gh: ${result.error.message}`, result.error);
  }

  // 处理非零退出码或信号终止
  if (result.status !== 0 || result.signal) {
    const msg = (result.stderr || result.stdout || "").trim();
    throw classifyGhStatusError(result.status, msg);
  }

  // 解析 JSON 响应
  const stdout = result.stdout || "";
  const json = JSON.parse(stdout) as GraphQLResponse<T>;

  // 处理 GraphQL 错误
  if (json.errors && json.errors.length > 0) {
    throw classifyGraphQlErrors(json.errors);
  }

  // 检查数据字段是否存在
  if (!json.data) {
    throw new GitHubNetworkError("GitHub GraphQL: missing data field");
  }

  return json.data;
}

/**
 * 根据 gh 命令退出状态和错误消息分类错误
 *
 * 分析 gh CLI 的 stderr/stdout 输出，识别错误类型并抛出相应的异常。
 *
 * 错误分类策略：
 * 1. 认证相关错误 -> GitHubAuthError
 *    - bad credentials（凭据无效）
 *    - must authenticate（需要认证）
 *    - unauthorized / forbidden（未授权/禁止访问）
 *    - resource not accessible（资源不可访问）
 *    - api rate limit exceeded（速率限制超出）
 *
 * 2. 网络相关错误 -> GitHubNetworkError
 *    - could not resolve host（DNS 解析失败）
 *    - getaddrinfo enotfound（域名解析失败）
 *    - connect etimedout（连接超时）
 *    - network is unreachable（网络不可达）
 *    - tls handshake timeout（TLS 握手超时）
 *
 * 3. 其他错误 -> GitHubNetworkError（默认）
 *
 * @param status - gh 命令的退出状态码
 * @param msg - gh 命令的错误消息（来自 stderr 或 stdout）
 * @returns 分类后的错误对象
 */
function classifyGhStatusError(status: number | null, msg: string): Error {
  const text = msg || "";
  const lower = text.toLowerCase();

  // 检查是否为认证错误
  if (
    lower.includes("bad credentials") ||
    lower.includes("must authenticate") ||
    lower.includes("unauthorized") ||
    lower.includes("forbidden") ||
    lower.includes("resource not accessible by personal access token") ||
    lower.includes("api rate limit exceeded")
  ) {
    return new GitHubAuthError(`GitHub authentication error: ${text}`, { status, msg: text });
  }

  // 检查是否为网络错误
  if (
    lower.includes("could not resolve host") ||
    lower.includes("could not resolve") ||
    lower.includes("name or service not known") ||
    lower.includes("getaddrinfo enotfound") ||
    lower.includes("connect etimedout") ||
    lower.includes("network is unreachable") ||
    lower.includes("tls handshake timeout")
  ) {
    return new GitHubNetworkError(`Network error talking to GitHub: ${text}`, {
      status,
      msg: text
    });
  }

  // 默认归类为网络错误
  return new GitHubNetworkError(
    `gh api graphql failed (exit ${status ?? "unknown"}): ${text}`,
    { status, msg: text }
  );
}

/**
 * 根据 GraphQL 错误消息分类错误
 *
 * 分析 GitHub GraphQL API 返回的错误列表，识别错误类型并抛出相应的异常。
 *
 * 错误分类策略：
 * 1. 资源不存在错误 -> GitHubNotFoundError
 *    - "could not resolve to a user with the login"（用户不存在）
 *
 * 2. 认证相关错误 -> GitHubAuthError
 *    - bad credentials（凭据无效）
 *    - must authenticate（需要认证）
 *    - resource not accessible（资源不可访问）
 *    - api rate limit exceeded（速率限制超出）
 *
 * 3. 其他 GraphQL 错误 -> GitHubAuthError（默认）
 *    （大多数 GraphQL 错误都与权限或认证相关）
 *
 * @param errors - GraphQL 错误对象数组
 * @returns 分类后的错误对象
 */
function classifyGraphQlErrors(errors: { message: string }[]): Error {
  // 合并所有错误消息
  const combined = errors.map((e) => e.message).join("; ");
  const lower = combined.toLowerCase();

  // 检查是否为"资源不存在"错误
  if (lower.includes("could not resolve to a user with the login")) {
    return new GitHubNotFoundError(`GitHub user not found or inaccessible: ${combined}`, errors);
  }

  // 检查是否为认证错误
  if (
    lower.includes("bad credentials") ||
    lower.includes("must authenticate") ||
    lower.includes("resource not accessible by personal access token") ||
    lower.includes("api rate limit exceeded")
  ) {
    return new GitHubAuthError(`GitHub authentication error: ${combined}`, errors);
  }

  // 默认归类为认证错误（大多数 GraphQL 错误都与权限相关）
  return new GitHubAuthError(`GitHub GraphQL error: ${combined}`, errors);
}

