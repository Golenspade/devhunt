import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { analyzeAll, RepoRecord, PRRecord, computeTopRepos } from "./analyze";
import { renderLanguagesChart, renderHoursChart } from "./charts";

export interface ReportOptions {
  login: string;
  tzOverride?: string | null;
  outDir?: string;
}

export async function reportUser(options: ReportOptions): Promise<void> {
  const { login } = options;
  const baseOut = options.outDir ?? join("out", login);
  const rawDir = join(baseOut, "raw");
  const chartsDir = join(baseOut, "charts");

  const [repos, prs] = await Promise.all([
    readJsonl<RepoRecord>(join(rawDir, "repos.jsonl")),
    readJsonl<PRRecord>(join(rawDir, "prs.jsonl"))
  ]);

  const analysis = analyzeAll({ login, repos, prs, tzOverride: options.tzOverride });
  const topRepos = computeTopRepos(repos);

  await mkdir(baseOut, { recursive: true });

  await Promise.all([
    writeFile(join(baseOut, "profile.json"), JSON.stringify(analysis.profile, null, 2), "utf8"),
    writeFile(join(baseOut, "top_repos.json"), JSON.stringify(topRepos, null, 2), "utf8"),
    renderLanguagesChart(chartsDir, analysis.profile.skills),
    renderHoursChart(chartsDir, analysis.hoursHistogram)
  ]);
}

async function readJsonl<T>(path: string): Promise<T[]> {
  try {
    const text = await readFile(path, "utf8");
    const lines = text.split(/\r?\n/).filter(Boolean);
    return lines.map((line) => JSON.parse(line) as T);
  } catch (err: any) {
    if (err && err.code === "ENOENT") {
      return [];
    }
    throw err;
  }
}

