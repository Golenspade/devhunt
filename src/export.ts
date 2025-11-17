import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { analyzeAll, computeTopRepos } from "./analyze";
import type { RepoRecord, PRRecord } from "./analyze";
import { renderLanguagesChart, renderHoursChart } from "./charts";
import { AnalysisError } from "./errors";

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

  console.log(`[devhunt] Generating report for ${login}...`);
  console.log(`[devhunt] Reading raw data from ${rawDir}`);

  const [repos, prs] = await Promise.all([
    readJsonl<RepoRecord>(join(rawDir, "repos.jsonl")),
    readJsonl<PRRecord>(join(rawDir, "prs.jsonl"))
  ]);

  console.log(`[devhunt] Loaded ${repos.length} repositories and ${prs.length} pull requests`);
  if (repos.length === 0 && prs.length === 0) {
    console.warn("[devhunt] Warning: no raw data found; did you run 'bun devhunt scan' first?");
  }

  let analysis: ReturnType<typeof analyzeAll>;
  let topRepos: ReturnType<typeof computeTopRepos>;
  try {
    analysis = analyzeAll({ login, repos, prs, tzOverride: options.tzOverride });
    topRepos = computeTopRepos(repos);
  } catch (err) {
    throw new AnalysisError(
      `Failed to analyze data for ${login}: ${(err as Error).message}`,
      err
    );
  }

  await mkdir(baseOut, { recursive: true });
  console.log(`[devhunt] Writing profile.json and top_repos.json to ${baseOut}`);

  try {
    await Promise.all([
      writeFile(join(baseOut, "profile.json"), JSON.stringify(analysis.profile, null, 2), "utf8"),
      writeFile(join(baseOut, "top_repos.json"), JSON.stringify(topRepos, null, 2), "utf8"),
      renderLanguagesChart(chartsDir, analysis.profile.skills),
      renderHoursChart(chartsDir, analysis.hoursHistogram)
    ]);
  } catch (err) {
    throw new AnalysisError(
      `Failed to generate charts or write report files: ${(err as Error).message}`,
      err
    );
  }

  console.log("[devhunt] Report artifacts:");
  console.log(`  - ${join(baseOut, "profile.json")}`);
  console.log(`  - ${join(baseOut, "top_repos.json")}`);
  console.log(`  - ${join(chartsDir, "languages.svg")}`);
  console.log(`  - ${join(chartsDir, "hours.svg")}`);
  console.log("[devhunt] Report complete.");
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

