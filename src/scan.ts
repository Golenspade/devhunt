import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { graphqlFromFile } from "./gh";
import type { GitHubClientOptions } from "./gh";
import { GitHubNotFoundError } from "./errors";
import { parseEmailInfo } from "./email";

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

interface UserIdResult {
  user: { id: string } | null;
}

interface RepoCommitsConnection {
  repository: {
    name: string;
    owner: { login: string };
    isFork: boolean;
    defaultBranchRef: {
      name: string;
      target: {
        history: {
          pageInfo: { hasNextPage: boolean; endCursor: string | null };
          nodes: CommitNode[];
        };
      } | null;
    } | null;
  } | null;
}

interface CommitNode {
  oid: string;
  authoredDate: string;
  committedDate: string;
  messageHeadline: string;
  messageBody: string | null;
  additions: number;
  deletions: number;
  changedFiles: number;
  parents: { totalCount: number };
  author: {
    name: string | null;
    email: string | null;
    user: { login: string } | null;
  } | null;
  committer: {
    name: string | null;
    email: string | null;
    user: { login: string } | null;
  } | null;
  associatedPullRequests: {
    nodes: AssociatedPullRequestNode[];
  };
}

interface AssociatedPullRequestNode {
  number: number;
  url: string;
  state: "OPEN" | "MERGED" | "CLOSED";
  createdAt: string;
  mergedAt: string | null;
  closedAt: string | null;
  isCrossRepository: boolean;
  baseRefName: string | null;
  headRefName: string | null;
  baseRepository: {
    owner: { login: string };
    name: string;
    stargazerCount: number;
    pullRequests: { totalCount: number };
    defaultBranchRef: { name: string } | null;
  } | null;
  headRepository: {
    owner: { login: string };
    name: string;
    stargazerCount: number;
    isFork: boolean;
  } | null;
}

interface CommitRecord {
  repo: {
    owner: string;
    name: string;
    isOwn: boolean;
  };
  sha: string;
  authoredAt: string;
  committedAt: string;
  messageHeadline: string;
  messageBody: string | null;
  isMerge: boolean;
  stats: {
    additions: number;
    deletions: number;
    changedFiles: number;
  };
  author: {
    login: string | null;
    name: string | null;
    email: string | null;
    emailDomain: string | null;
    emailTld: ".edu" | ".gov" | ".org" | "other";
  };
  associatedPRs: {
    number: number;
    url: string;
    state: "OPEN" | "MERGED" | "CLOSED";
    isMerged: boolean;
    baseRef: string | null;
    headRef: string | null;
    isCrossRepository: boolean;
    createdAt: string;
    mergedAt: string | null;
    closedAt: string | null;
    baseRepo: {
      owner: string;
      name: string;
      stargazerCount: number;
      totalPrCount: number | null;
      defaultBranch: string | null;
    } | null;
    headRepo: {
      owner: string;
      name: string;
      stargazerCount: number | null;
      totalPrCount: number | null;
      isFork: boolean | null;
    } | null;
  }[];
}


export interface ScanOptions extends GitHubClientOptions {
  login: string;
  outDir?: string;
  since?: string | null;
}

const reposQueryPath = new URL("./queries/user_repos.graphql", import.meta.url).pathname;
const prsQueryPath = new URL("./queries/user_prs.graphql", import.meta.url).pathname;
const userIdQueryPath = new URL("./queries/user_id.graphql", import.meta.url).pathname;
const repoCommitsQueryPath = new URL("./queries/repo_commits.graphql", import.meta.url).pathname;

export async function scanUser(options: ScanOptions): Promise<void> {
  const { login } = options;
  const baseOut = options.outDir ?? join("out", login);
  const rawOut = join(baseOut, "raw");

  console.log(`[devhunt] Scanning GitHub user ${login}...`);
  console.log(`[devhunt] Raw output directory: ${rawOut}`);

  const since = options.since ?? null;
  if (since) {
    console.log(`[devhunt] Commit time window: since ${since}`);
  } else {
    console.log("[devhunt] Commit time window: full history");
  }

  await mkdir(rawOut, { recursive: true });

  const [authorId, repos, prs] = await Promise.all([
    fetchUserId(login, options),
    fetchAllRepos(login, reposQueryPath, options),
    fetchAllPRs(login, prsQueryPath, options),
  ]);

  const commits = await fetchAllCommits(login, authorId, repos, since, options);

  console.log(
    `[devhunt] Fetched ${repos.length} repositories, ${prs.length} pull requests and ${commits.length} commits`,
  );

  const reposJsonl = repos.map((r) => JSON.stringify(r)).join("\n") + (repos.length ? "\n" : "");
  const prsJsonl = prs.map((p) => JSON.stringify(p)).join("\n") + (prs.length ? "\n" : "");
  const commitsJsonl =
    commits.map((c) => JSON.stringify(c)).join("\n") + (commits.length ? "\n" : "");

  console.log("[devhunt] Writing raw JSONL files...");
  await writeFile(join(rawOut, "repos.jsonl"), reposJsonl, "utf8");
  await writeFile(join(rawOut, "prs.jsonl"), prsJsonl, "utf8");
  await writeFile(join(rawOut, "commits.jsonl"), commitsJsonl, "utf8");
  console.log("[devhunt] Raw data written to:");
  console.log(`  - ${join(rawOut, "repos.jsonl")}`);
  console.log(`  - ${join(rawOut, "prs.jsonl")}`);
  console.log(`  - ${join(rawOut, "commits.jsonl")}`);
  console.log("[devhunt] Scan complete.");
}


async function fetchAllRepos(
  login: string,
  queryPath: string,
  options: GitHubClientOptions,
): Promise<RepoNode[]> {
  const all: RepoNode[] = [];
  let after: string | null = null;

  // Paginate until no more pages
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const data: ReposConnection = await graphqlFromFile<ReposConnection>(
      queryPath,
      { login, after },
      options,
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
  options: GitHubClientOptions,
): Promise<PRNode[]> {
  const all: PRNode[] = [];
  let after: string | null = null;

  while (true) {
    const data: PRsConnection = await graphqlFromFile<PRsConnection>(
      queryPath,
      { login, after },
      options,
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

async function fetchUserId(login: string, options: GitHubClientOptions): Promise<string> {
  const data: UserIdResult = await graphqlFromFile<UserIdResult>(userIdQueryPath, { login }, options);

  if (!data.user) {
    throw new GitHubNotFoundError(`GitHub user '${login}' not found or inaccessible`, data);
  }

  return data.user.id;
}

async function fetchAllCommits(
  login: string,
  authorId: string,
  repos: RepoNode[],
  since: string | null,
  options: GitHubClientOptions,
): Promise<CommitRecord[]> {
  const all: CommitRecord[] = [];

  for (const repo of repos) {
    const repoCommits = await fetchCommitsForRepo(login, authorId, repo, since, options);
    if (repoCommits.length > 0) {
      all.push(...repoCommits);
    }
  }

  return all;
}

async function fetchCommitsForRepo(
  login: string,
  authorId: string,
  repo: RepoNode,
  since: string | null,
  options: GitHubClientOptions,
): Promise<CommitRecord[]> {
  const all: CommitRecord[] = [];
  let after: string | null = null;
  const ownerLogin = repo.owner.login;

  while (true) {
    const data: RepoCommitsConnection = await graphqlFromFile<RepoCommitsConnection>(
      repoCommitsQueryPath,
      { owner: ownerLogin, name: repo.name, authorId, since, after },
      options,
    );

    const repository = data.repository;
    const defaultBranch = repository?.defaultBranchRef;
    const target = defaultBranch?.target;

    if (!repository || !defaultBranch || !target) {
      break;
    }

    const history = target.history;

    if (history.nodes && history.nodes.length > 0) {
      for (const node of history.nodes) {
        all.push(toCommitRecord(login, repository, node));
      }
    }

    if (!history.pageInfo.hasNextPage) break;
    after = history.pageInfo.endCursor;
  }

  return all;
}

function toCommitRecord(login: string, repository: RepoCommitsConnection["repository"], node: CommitNode): CommitRecord {
  const ownerLogin = repository?.owner.login ?? "";
  const repoName = repository?.name ?? "";
  const isOwn = ownerLogin.toLowerCase() === login.toLowerCase();

  const authorLogin = node.author?.user?.login ?? null;
  const authorName = node.author?.name ?? null;
  const authorEmail = node.author?.email ?? null;

  const { emailDomain, emailTld } = parseEmailInfo(authorEmail);

  const associatedPRs = node.associatedPullRequests?.nodes?.map((pr) => {
    const baseRepo = pr.baseRepository
      ? {
          owner: pr.baseRepository.owner.login,
          name: pr.baseRepository.name,
          stargazerCount: pr.baseRepository.stargazerCount,
          totalPrCount: pr.baseRepository.pullRequests.totalCount ?? null,
          defaultBranch: pr.baseRepository.defaultBranchRef?.name ?? null,
        }
      : null;

    const headRepo = pr.headRepository
      ? {
          owner: pr.headRepository.owner.login,
          name: pr.headRepository.name,
          stargazerCount: pr.headRepository.stargazerCount,
          totalPrCount: null,
          isFork: pr.headRepository.isFork,
        }
      : null;

    const isMerged = pr.state === "MERGED" || pr.mergedAt != null;

    return {
      number: pr.number,
      url: pr.url,
      state: pr.state,
      isMerged,
      baseRef: pr.baseRefName,
      headRef: pr.headRefName,
      isCrossRepository: pr.isCrossRepository,
      createdAt: pr.createdAt,
      mergedAt: pr.mergedAt,
      closedAt: pr.closedAt,
      baseRepo,
      headRepo,
    };
  });

  return {
    repo: {
      owner: ownerLogin,
      name: repoName,
      isOwn,
    },
    sha: node.oid,
    authoredAt: node.authoredDate,
    committedAt: node.committedDate,
    messageHeadline: node.messageHeadline,
    messageBody: node.messageBody,
    isMerge: node.parents.totalCount > 1,
    stats: {
      additions: node.additions,
      deletions: node.deletions,
      changedFiles: node.changedFiles,
    },
    author: {
      login: authorLogin,
      name: authorName,
      email: authorEmail,
      emailDomain,
      emailTld,
    },
    associatedPRs: associatedPRs ?? [],
  };
}

