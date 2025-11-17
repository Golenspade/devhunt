import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { graphqlFromFile } from "./gh";
import type { GitHubClientOptions } from "./gh";
import { GitHubNotFoundError } from "./errors";

interface ReposConnection {
  user: {
    repositories: {
      pageInfo: { hasNextPage: boolean; endCursor: string | null };
      nodes: RepoNode[];
    };
  } | null;
}

interface RepoNode {
  name: string;
  isFork: boolean;
  isArchived: boolean;
  primaryLanguage: { name: string } | null;
  stargazerCount: number;
  forkCount: number;
  watchers?: { totalCount: number } | null;
  licenseInfo?: { spdxId: string | null } | null;
  createdAt: string;
  pushedAt: string | null;
  owner: { login: string };
}

interface PRsConnection {
  user: {
    pullRequests: {
      pageInfo: { hasNextPage: boolean; endCursor: string | null };
      nodes: PRNode[];
    };
  } | null;
}

interface PRNode {
  createdAt: string;
  mergedAt: string | null;
  closedAt: string | null;
  isCrossRepository: boolean;
  additions: number;
  deletions: number;
  changedFiles: number;
  repository: { name: string; owner: { login: string } };
  url: string;
}

export interface ScanOptions extends GitHubClientOptions {
  login: string;
  outDir?: string;
}

const reposQueryPath = new URL("./queries/user_repos.graphql", import.meta.url).pathname;
const prsQueryPath = new URL("./queries/user_prs.graphql", import.meta.url).pathname;

export async function scanUser(options: ScanOptions): Promise<void> {
  const { login } = options;
  const baseOut = options.outDir ?? join("out", login);
  const rawOut = join(baseOut, "raw");

  console.log(`[devhunt] Scanning GitHub user ${login}...`);
  console.log(`[devhunt] Raw output directory: ${rawOut}`);

  await mkdir(rawOut, { recursive: true });

  const repos = await fetchAllRepos(login, reposQueryPath, options);
  const prs = await fetchAllPRs(login, prsQueryPath, options);

  console.log(`[devhunt] Fetched ${repos.length} repositories and ${prs.length} pull requests`);

  const reposJsonl = repos.map((r) => JSON.stringify(r)).join("\n") + (repos.length ? "\n" : "");
  const prsJsonl = prs.map((p) => JSON.stringify(p)).join("\n") + (prs.length ? "\n" : "");

  console.log("[devhunt] Writing raw JSONL files...");
  await writeFile(join(rawOut, "repos.jsonl"), reposJsonl, "utf8");
  await writeFile(join(rawOut, "prs.jsonl"), prsJsonl, "utf8");
  console.log("[devhunt] Raw data written to:");
  console.log(`  - ${join(rawOut, "repos.jsonl")}`);
  console.log(`  - ${join(rawOut, "prs.jsonl")}`);
  console.log("[devhunt] Scan complete.");
}

async function fetchAllRepos(
  login: string,
  queryPath: string,
  options: GitHubClientOptions
): Promise<RepoNode[]> {
  const all: RepoNode[] = [];
  let after: string | null = null;

  // Paginate until no more pages
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const data: ReposConnection = await graphqlFromFile<ReposConnection>(
      queryPath,
      { login, after },
      options
    );

    if (!data.user) {
      throw new GitHubNotFoundError(`GitHub user '${login}' not found or inaccessible`, data);
    }

    const conn = data.user.repositories;

    if (conn.nodes && conn.nodes.length > 0) {
      all.push(...conn.nodes);
    }

    if (!conn.pageInfo.hasNextPage) break;
    after = conn.pageInfo.endCursor;
  }

  return all;
}

async function fetchAllPRs(
  login: string,
  queryPath: string,
  options: GitHubClientOptions
): Promise<PRNode[]> {
  const all: PRNode[] = [];
  let after: string | null = null;

  while (true) {
    const data: PRsConnection = await graphqlFromFile<PRsConnection>(
      queryPath,
      { login, after },
      options
    );

    if (!data.user) {
      throw new GitHubNotFoundError(`GitHub user '${login}' not found or inaccessible`, data);
    }

    const conn = data.user.pullRequests;

    if (conn.nodes && conn.nodes.length > 0) {
      all.push(...conn.nodes);
    }

    if (!conn.pageInfo.hasNextPage) break;
    after = conn.pageInfo.endCursor;
  }

  return all;
}

