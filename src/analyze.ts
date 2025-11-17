export interface RepoRecord {
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

export interface PRRecord {
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

export interface ProfileJSON {
  login: string;
  timezone: { auto: string | null; override: string | null; used: string | null };
  skills: { lang: string; weight: number }[];
  core_hours: { start: string; end: string }[];
  uoi: number;
  external_pr_accept_rate: number;
  summary_evidence: { sample_prs: string[]; sample_repos: string[] };
}

export interface AnalysisResult {
  profile: ProfileJSON;
  hoursHistogram: number[]; // length 24
}

export interface AnalyzeOptions {
  login: string;
  repos: RepoRecord[];
  prs: PRRecord[];
  tzOverride?: string | null;
}

export function analyzeAll(options: AnalyzeOptions): AnalysisResult {
  const { login, repos, prs, tzOverride } = options;

  const langWeights = computeLanguageWeights(repos);
  const tzOffsetMinutes = parseTimezoneOffset(tzOverride);
  const hoursHistogram = computeHoursHistogram(prs, tzOffsetMinutes);
  const coreHours = computeCoreHours(hoursHistogram);
  const uoi = computeUoi(prs, login);
  const externalRate = computeExternalPrAcceptRate(prs, login);
  const timezone = buildTimezone(tzOverride, tzOffsetMinutes);
  const summary = buildSummaryEvidence(login, repos, prs);

  return {
    profile: {
      login,
      timezone,
      skills: langWeights,
      core_hours: coreHours,
      uoi,
      external_pr_accept_rate: externalRate,
      summary_evidence: summary
    },
    hoursHistogram
  };
}

export function computeLanguageWeights(repos: RepoRecord[]): { lang: string; weight: number }[] {
  const weights = new Map<string, number>();

  for (const repo of repos) {
    const lang = repo.primaryLanguage?.name;
    if (!lang) continue;
    const stars = repo.stargazerCount ?? 0;
    const w = Math.log1p(stars);
    if (w <= 0) continue;
    weights.set(lang, (weights.get(lang) ?? 0) + w);
  }

  const entries = Array.from(weights.entries());
  const total = entries.reduce((sum, [, w]) => sum + w, 0) || 1;

  return entries
    .map(([lang, w]) => ({ lang, weight: w / total }))
    .sort((a, b) => b.weight - a.weight);
}

export function computeHoursHistogram(prs: PRRecord[], tzOffsetMinutes: number): number[] {
  const buckets = Array.from({ length: 24 }, () => 0);

  for (const pr of prs) {
    const dt = new Date(pr.createdAt);
    if (Number.isNaN(dt.getTime())) continue;
    const utcHours = dt.getUTCHours();
    const localHours = (utcHours + tzOffsetMinutes / 60 + 24 * 3) % 24; // prevent negatives
    const idx = Math.floor(localHours) % 24;
    buckets[idx]++;
  }

  return buckets;
}

export function computeCoreHours(hist: number[]): { start: string; end: string }[] {
  const pairs: { start: number; end: number; value: number }[] = [];

  for (let h = 0; h < 24; h++) {
    const next = (h + 1) % 24;
    const value = hist[h] + hist[next];
    pairs.push({ start: h, end: next, value });
  }

  pairs.sort((a, b) => b.value - a.value);
  const top = pairs.slice(0, 2);

  return top.map((p) => ({ start: formatHour(p.start), end: formatHour(p.end) }));
}

export function computeUoi(prs: PRRecord[], login: string): number {
  let external = 0;
  let self = 0;
  const lower = login.toLowerCase();

  for (const pr of prs) {
    const owner = pr.repository.owner.login.toLowerCase();
    if (owner === lower) self++;
    else external++;
  }

  const denom = external + self;
  return denom === 0 ? 0 : external / denom;
}

export function computeExternalPrAcceptRate(prs: PRRecord[], login: string): number {
  const lower = login.toLowerCase();
  let externalTotal = 0;
  let merged = 0;

  for (const pr of prs) {
    const owner = pr.repository.owner.login.toLowerCase();
    if (owner === lower) continue; // self PR
    externalTotal++;
    if (pr.mergedAt) merged++;
  }

  if (externalTotal === 0) return 0;
  return merged / externalTotal;
}

export function computeTopRepos(repos: RepoRecord[], now: Date = new Date()) {
  const yearMs = 365 * 24 * 60 * 60 * 1000;

  return repos
    .map((repo) => {
      const stars = repo.stargazerCount ?? 0;
      const pushedAt = repo.pushedAt ? new Date(repo.pushedAt) : null;
      const recent = pushedAt ? now.getTime() - pushedAt.getTime() <= yearMs : false;
      const recencyFactor = recent ? 1.3 : 1;
      const score = Math.pow(stars, 0.6) * recencyFactor;
      return {
        repo: `${repo.owner.login}/${repo.name}`,
        lang: repo.primaryLanguage?.name ?? null,
        stars,
        score,
        isFork: repo.isFork,
        lastPush: repo.pushedAt
      };
    })
    .sort((a, b) => b.score - a.score);
}

export function parseTimezoneOffset(tz?: string | null): number {
  if (!tz) return 0; // default UTC

  const offsetMatch = tz.match(/^([+-])(\d{2}):(\d{2})$/);
  if (offsetMatch) {
    const sign = offsetMatch[1] === "-" ? -1 : 1;
    const hours = Number(offsetMatch[2]);
    const minutes = Number(offsetMatch[3]);
    return sign * (hours * 60 + minutes);
  }

  if (tz === "Asia/Shanghai") {
    return 8 * 60;
  }

  return 0;
}

export function buildTimezone(
  tzOverride: string | null | undefined,
  tzOffsetMinutes: number
): { auto: string | null; override: string | null; used: string | null } {
  const override = tzOverride ?? null;
  const usedOffset = override ? tzOffsetMinutes : 0;
  const usedStr = formatOffset(usedOffset);

  return {
    auto: "+00:00",
    override,
    used: usedStr
  };
}

export function buildSummaryEvidence(
  login: string,
  repos: RepoRecord[],
  prs: PRRecord[]
): { sample_prs: string[]; sample_repos: string[] } {
  const sample_prs = prs.slice(0, 5).map((pr) => pr.url);
  const sample_repos = repos
    .slice(0, 5)
    .map((r) => `https://github.com/${r.owner.login}/${r.name}`);

  return { sample_prs, sample_repos };
}

function formatHour(h: number): string {
  const hh = h.toString().padStart(2, "0");
  return `${hh}:00`;
}

function formatOffset(minutes: number): string {
  const sign = minutes < 0 ? "-" : "+";
  const abs = Math.abs(minutes);
  const h = Math.floor(abs / 60)
    .toString()
    .padStart(2, "0");
  const m = (abs % 60).toString().padStart(2, "0");
  return `${sign}${h}:${m}`;
}

