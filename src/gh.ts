import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";


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
    throw new Error(`Failed to run gh: ${result.error.message}`);
  }

  if (result.status !== 0 || result.signal) {
    const msg = result.stderr || result.stdout;
    throw new Error(`gh api graphql failed (exit ${result.status ?? "unknown"}): ${msg}`);
  }

  const stdout = result.stdout || "";
  const json = JSON.parse(stdout) as GraphQLResponse<T>;

  if (json.errors && json.errors.length > 0) {
    const msg = json.errors.map((e) => e.message).join("; ");
    throw new Error(`GitHub GraphQL error: ${msg}`);
  }

  if (!json.data) {
    throw new Error("GitHub GraphQL: missing data field");
  }

  return json.data;
}

