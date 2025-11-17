import { describe, it, expect } from "bun:test";
import {
  analyzeAll,
  computeLanguageWeights,
  computeHoursHistogram,
  computeCoreHours,
  computeUoi,
  computeExternalPrAcceptRate,
  computeTopRepos,
  parseTimezoneOffset,
  buildTimezone,
  buildSummaryEvidence,
  analyzeProfileReadme
} from "./analyze";
import type { RepoRecord, PRRecord } from "./analyze";

function makeRepo(owner: string, name: string, stars: number, pushedAt: string): RepoRecord {
  return {
    name,
    isFork: false,
    isArchived: false,
    primaryLanguage: { name: "TypeScript" },
    stargazerCount: stars,
    forkCount: 0,
    createdAt: "2024-01-01T00:00:00Z",
    pushedAt,
    owner: { login: owner }
  };
}

function makePr(createdAt: string, owner: string, merged = false): PRRecord {
  const mergedAt = merged ? "2024-01-02T00:00:00Z" : null;
  return {
    createdAt,
    mergedAt,
    closedAt: mergedAt,
    isCrossRepository: owner !== "self",
    additions: 0,
    deletions: 0,
    changedFiles: 0,
    repository: { name: "repo", owner: { login: owner } },
    url: `https://example.com/${owner}/${createdAt}`
  };
}

describe("analyze core metrics", () => {
  it("computes language weights normalized by stars", () => {
    const repos: RepoRecord[] = [
      makeRepo("self", "a", 10, "2024-01-02T00:00:00Z"),
      makeRepo("self", "b", 5, "2024-01-03T00:00:00Z"),
      {
        ...makeRepo("self", "c", 0, "2024-01-04T00:00:00Z"),
        primaryLanguage: null
      }
    ];

    const weights = computeLanguageWeights(repos);
    expect(weights.length).toBe(1);
    expect(weights[0].lang).toBe("TypeScript");
    expect(weights[0].weight).toBeCloseTo(1, 5);
  });

  it("bins PRs into hours and derives core hours", () => {
    const prs: PRRecord[] = [
      makePr("2024-01-01T10:15:00Z", "self"),
      makePr("2024-01-01T10:45:00Z", "self"),
      makePr("2024-01-01T18:30:00Z", "other"),
      makePr("2024-01-01T19:30:00Z", "other")
    ];

    const hist = computeHoursHistogram(prs, 0);
    expect(hist[10]).toBe(2);
    expect(hist[18]).toBe(1);
    expect(hist[19]).toBe(1);

    const core = computeCoreHours(hist);
    expect(core.length).toBe(2);
    expect(core[0]).toEqual({ start: "09:00", end: "10:00" });
  });

  it("computes UOI and external PR accept rate", () => {
    const login = "self";
    const prs: PRRecord[] = [
      makePr("2024-01-01T00:00:00Z", "self"),
      makePr("2024-01-02T00:00:00Z", "other", true),
      makePr("2024-01-03T00:00:00Z", "other", false)
    ];

    const uoi = computeUoi(prs, login);
    expect(uoi).toBeCloseTo(2 / 3, 5);

    const rate = computeExternalPrAcceptRate(prs, login);
    expect(rate).toBeCloseTo(1 / 2, 5);
  });

  it("parses timezone offsets and builds timezone info", () => {
    expect(parseTimezoneOffset("Asia/Shanghai")).toBe(8 * 60);
    expect(parseTimezoneOffset("+09:30")).toBe(9 * 60 + 30);
    expect(parseTimezoneOffset("-05:00")).toBe(-5 * 60);
    expect(parseTimezoneOffset(undefined)).toBe(0);

    const tz = buildTimezone("Asia/Shanghai", 8 * 60);
    expect(tz).toEqual({ auto: "+00:00", override: "Asia/Shanghai", used: "+08:00" });
  });

  it("computes top repos and summary evidence and integrates in analyzeAll", () => {
    const repos: RepoRecord[] = [
      makeRepo("self", "a", 50, "2024-01-10T00:00:00Z"),
      makeRepo("self", "b", 10, "2022-01-01T00:00:00Z")
    ];
    const prs: PRRecord[] = [makePr("2024-01-01T10:00:00Z", "other", true)];

    const top = computeTopRepos(repos, new Date("2024-02-01T00:00:00Z"));
    expect(top[0].repo).toBe("self/a");

    const summary = buildSummaryEvidence("self", repos, prs);
    expect(summary.sample_prs.length).toBe(1);
    expect(summary.sample_repos[0]).toBe("https://github.com/self/a");

    const result = analyzeAll({ login: "self", repos, prs, tzOverride: "+08:00" });
    expect(result.profile.login).toBe("self");
    expect(result.profile.skills.length).toBeGreaterThan(0);
    expect(result.hoursHistogram.length).toBe(24);
  });
});


describe("analyzeProfileReadme", () => {
  it("returns none when markdown is null", () => {
    const result = analyzeProfileReadme(null);
    expect(result.style).toBe("none");
    expect(result.markdown).toBeNull();
    expect(result.text_excerpt).toBeNull();
    expect(result.image_alt_texts).toEqual([]);
  });

  it("classifies empty or whitespace markdown as empty", () => {
    const result = analyzeProfileReadme("   \n\n  ");
    expect(result.style).toBe("empty");
    expect(result.markdown).toBe("");
    expect(result.text_excerpt).toBeNull();
    expect(result.image_alt_texts).toEqual([]);
  });

  it("detects one-liner style", () => {
    const md = "I like deep neural nets.";
    const result = analyzeProfileReadme(md);
    expect(result.style).toBe("one_liner");
    expect(result.markdown).toBe(md);
    expect(result.text_excerpt).toBe("I like deep neural nets.");
    expect(result.image_alt_texts).toEqual([]);
  });

  it("detects visual dashboard style and extracts image alt texts", () => {
    const md = [
      "![GitHub Stats](https://example.com/stats.svg)",
      "![Top Langs](https://example.com/langs.svg)",
      "<img src=\"https://example.com/other.svg\" alt=\"Other badge\" />"
    ].join("\n");

    const result = analyzeProfileReadme(md);
    expect(result.style).toBe("visual_dashboard");
    expect(result.text_excerpt).toBeNull();
    expect(result.image_alt_texts).toEqual([
      "GitHub Stats",
      "Top Langs",
      "Other badge"
    ]);
  });

  it("detects short bio style", () => {
    const md = [
      "# Hi, I'm Alice",
      "",
      "I am a software engineer focusing on developer tools and infrastructure. ",
      "Previously worked on large scale systems and enjoy mentoring and writing."
    ].join("\n");

    const result = analyzeProfileReadme(md);
    expect(result.style).toBe("short_bio");
    expect(result.text_excerpt).toContain("Hi, I'm Alice");
    expect(result.image_alt_texts).toEqual([]);
  });

  it("falls back to mixed when text and images are both present", () => {
    const md = [
      "I'm a full-stack developer.",
      "I build web apps and CLIs.",
      "![Badge](https://example.com/badge.svg)"
    ].join("\n");

    const result = analyzeProfileReadme(md);
    expect(result.style).toBe("mixed");
    expect(result.text_excerpt).toContain("full-stack developer");
    expect(result.image_alt_texts).toEqual(["Badge"]);
  });
});


