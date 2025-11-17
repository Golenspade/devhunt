import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { CliError, GitHubAuthError, GitHubNetworkError, GitHubNotFoundError } from "./errors";

export interface GitHubClientOptions {
  token?: string | null;
}

interface GraphQLResponse<T> {
  data?: T;
  errors?: { message: string }[];
}

// Thin wrapper around `gh api graphql` that reads a query from a .graphql file
// and passes simple scalar variables via -F flags.
export async function graphqlFromFile<T>(
  queryFilePath: string,
  variables: Record<string, string | number | boolean | null | undefined>,
  options: GitHubClientOptions = {}
): Promise<T> {
  const env = { ...process.env } as Record<string, string>;

  const token = options.token ?? process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN ?? null;
  if (token) {
    env.GITHUB_TOKEN = token;
  }

  const query = readFileSync(queryFilePath, "utf8");
  const args: string[] = ["api", "graphql", "-f", `query=${query}`];

  for (const [key, value] of Object.entries(variables)) {
    if (value === undefined || value === null) continue;
    args.push("-F", `${key}=${value}`);
  }

  const result = spawnSync("gh", args, {
    encoding: "utf8",
    env
  });

  if (result.error) {
    const anyErr = result.error as any;
    if (anyErr && anyErr.code === "ENOENT") {
      throw new CliError('GitHub CLI "gh" not found in PATH. Please install GitHub CLI.');
    }
    throw new GitHubNetworkError(`Failed to run gh: ${result.error.message}`, result.error);
  }

  if (result.status !== 0 || result.signal) {
    const msg = (result.stderr || result.stdout || "").trim();
    throw classifyGhStatusError(result.status, msg);
  }

  const stdout = result.stdout || "";
  const json = JSON.parse(stdout) as GraphQLResponse<T>;

  if (json.errors && json.errors.length > 0) {
    throw classifyGraphQlErrors(json.errors);
  }

  if (!json.data) {
    throw new GitHubNetworkError("GitHub GraphQL: missing data field");
  }

  return json.data;
}

function classifyGhStatusError(status: number | null, msg: string): Error {
  const text = msg || "";
  const lower = text.toLowerCase();

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

  return new GitHubNetworkError(
    `gh api graphql failed (exit ${status ?? "unknown"}): ${text}`,
    { status, msg: text }
  );
}

function classifyGraphQlErrors(errors: { message: string }[]): Error {
  const combined = errors.map((e) => e.message).join("; ");
  const lower = combined.toLowerCase();

  if (lower.includes("could not resolve to a user with the login")) {
    return new GitHubNotFoundError(`GitHub user not found or inaccessible: ${combined}`, errors);
  }

  if (
    lower.includes("bad credentials") ||
    lower.includes("must authenticate") ||
    lower.includes("resource not accessible by personal access token") ||
    lower.includes("api rate limit exceeded")
  ) {
    return new GitHubAuthError(`GitHub authentication error: ${combined}`, errors);
  }

  return new GitHubAuthError(`GitHub GraphQL error: ${combined}`, errors);
}

