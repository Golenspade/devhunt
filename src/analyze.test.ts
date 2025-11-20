import { describe, it, expect } from "bun:test";
import {
  analyzeAll,
  computeLanguageWeights,
  computeLanguageWeightsV2,
  computeTopicWeights,
  computeHoursHistogram,
  computeCoreHours,
  computeNightRatio,
  computeFocusRatio,
  computeUoi,
  computeExternalPrAcceptRate,
  computeTopRepos,
  parseTimezoneOffset,
  buildTimezone,
  buildSummaryEvidence,
  analyzeProfileReadme,
  computeReadmeConsistency
} from "./analyze";
import type { RepoRecord, PRRecord, CommitRecord } from "./analyze";

import { computeForkDestiny, computeCommunityEngagement, computeGritFactor } from "./analysis/metrics";
import { computeProfileTags } from "./analysis/tags";
import type { ContributionsSummary } from "./types/github";

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

function makeCommit(authoredAt: string, overrides: Partial<CommitRecord> = {}): CommitRecord {
  return {
    repo: { owner: "self", name: "a", isOwn: true },
    sha: authoredAt,
    authoredAt,
    committedAt: authoredAt,
    messageHeadline: "c",
    messageBody: null,
    isMerge: false,
    stats: { additions: 1, deletions: 0, changedFiles: 1 },
    author: {
      login: "self",
      name: "Self",
      email: null,
      emailDomain: null,
      emailTld: "other"
    },
    associatedPRs: [],
    ...overrides
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
    const first = weights[0]!;
    expect(first.lang).toBe("TypeScript");
    expect(first.weight).toBeCloseTo(1, 5);
  });



  it("computes Focus Ratio based on raw language bytes", () => {
    const repos: RepoRecord[] = [
      {
        ...makeRepo("self", "a", 100, "2024-01-02T00:00:00Z"),
        languages: {
          edges: [
            { size: 9000, node: { name: "TypeScript" } },
            { size: 1000, node: { name: "JavaScript" } }
          ]
        }
      },
      {
        ...makeRepo("self", "b", 10, "2024-01-03T00:00:00Z"),
        languages: {
          edges: [{ size: 500, node: { name: "Python" } }]
        }
      }
    ];

    const focus = computeFocusRatio(repos);
    expect(focus.sample_size).toBe(9000 + 1000 + 500);
    expect(focus.value).not.toBeNull();
    // Top1 = TypeScript: 9000 / 10500   ~0.857
    expect(focus.value!).toBeCloseTo(9000 / 10500, 5);
  });


  it("computes Night Ratio from commits with authoredAt and excludes merges", () => {
    const commits: CommitRecord[] = [
      // 夜间 commit：23:00、01:00（UTC），时区偏移为 0
      makeCommit("2024-01-01T23:00:00Z"),
      makeCommit("2024-01-02T01:00:00Z"),
      // 白天 commit：09:00（UTC）
      makeCommit("2024-01-02T09:00:00Z"),
      // 夜间 merge commit：应被排除
      makeCommit("2024-01-02T22:00:00Z", { isMerge: true })
    ];

    const night = computeNightRatio(commits, 0);
    expect(night.sample_size).toBe(3); // 排除了 merge commit
    expect(night.value).not.toBeNull();
    expect(night.value!).toBeCloseTo(2 / 3, 5); // 2 个夜间 / 3 个非 merge commit
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
    expect(uoi).not.toBeNull();
    expect(uoi).toBeCloseTo(2 / 3, 5);

    const rate = computeExternalPrAcceptRate(prs, login);
    expect(rate).not.toBeNull();
    expect(rate).toBeCloseTo(1 / 2, 5);
  });
  it("computes Uni Index v0 for creator vs contributor archetypes", () => {
    const login = "self";
    const prs: PRRecord[] = [
      // one external merged PR
      makePr("2024-01-02T00:00:00Z", "other", true)
    ];
    const commits = [
      // two owned commits
      { repo: { owner: "self", name: "a", isOwn: true }, sha: "1", authoredAt: "2024-01-01T00:00:00Z", committedAt: "2024-01-01T00:00:00Z", messageHeadline: "c1", messageBody: null, isMerge: false, stats: { additions: 1, deletions: 0, changedFiles: 1 }, author: { login: "self", name: "Self", email: null, emailDomain: null, emailTld: "other" as const }, associatedPRs: [] },
      { repo: { owner: "self", name: "a", isOwn: true }, sha: "2", authoredAt: "2024-01-01T01:00:00Z", committedAt: "2024-01-01T01:00:00Z", messageHeadline: "c2", messageBody: null, isMerge: false, stats: { additions: 1, deletions: 0, changedFiles: 1 }, author: { login: "self", name: "Self", email: null, emailDomain: null, emailTld: "other" as const }, associatedPRs: [] }
    ];

    // creator-heavy: ownedActivity = 2 commits + 0 owned PR score, externalActivity = 1 base +1 merged = 2
    // Uni = 2 / (2+2) = 0.5
    const result = analyzeAll({ login, repos: [], prs, commits, tzOverride: "+00:00" });
    expect(result.profile.uni_index.value).toBeCloseTo(0.5, 5);
    expect(result.profile.uni_index.sample_size).toBe(3);
  });


  it("returns null for UOI and external PR accept rate when there is no data", () => {
    const login = "self";
    const prs: PRRecord[] = [];

    const uoi = computeUoi(prs, login);
    expect(uoi).toBeNull();

    const rate = computeExternalPrAcceptRate(prs, login);
    expect(rate).toBeNull();
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
    const firstTop = top[0]!;
    expect(firstTop.repo).toBe("self/a");

    const summary = buildSummaryEvidence("self", repos, prs);
    expect(summary.sample_prs.length).toBe(1);
    expect(summary.sample_repos[0]).toBe("https://github.com/self/a");

    const result = analyzeAll({ login: "self", repos, prs, tzOverride: "+08:00" });
    expect(result.profile.login).toBe("self");
    expect(result.profile.skills.length).toBeGreaterThan(0);
    expect(result.hoursHistogram.length).toBe(24);
    expect(result.profile.night_ratio).toBeNull();
    expect(result.profile.night_ratio_sample_size).toBe(0);
    expect(result.profile.focus_ratio).toBeNull();
    expect(result.profile.focus_ratio_sample_size).toBe(0);

    expect(result.profile.consistency.readme_vs_skills_consistency).toBe("unknown");
  });

  it("computes Grit Factor v2 classification and value", () => {
    const login = "self";
    const repos: RepoRecord[] = [
      // Long Term: 生命周期 >= 90 天，star 不做硬性要求
      {
        ...makeRepo("self", "long", 0, "2024-04-10T00:00:00Z"),
      },
      // Gem: 生命周期 < 90 天 且 stars >= 5
      {
        ...makeRepo("self", "gem", 10, "2024-02-01T00:00:00Z"),
      },
      // Churn: 生命周期 < 90 天 且 stars < 5
      {
        ...makeRepo("self", "churn", 0, "2024-01-15T00:00:00Z"),
      },
      // fork 仓库：应被排除
      {
        ...makeRepo("self", "forked", 100, "2024-05-01T00:00:00Z"),
        isFork: true,
      },
      // 非 self 拥有的仓库：应被排除
      {
        ...makeRepo("other", "external", 100, "2024-05-01T00:00:00Z"),
      },
    ];

    const result = computeGritFactor(repos, login);

    expect(result.sample_size).toBe(3);
    expect(result.long_term_count).toBe(1);
    expect(result.gem_count).toBe(1);
    expect(result.churn_count).toBe(1);
    expect(result.value).not.toBeNull();
    expect(result.value!).toBeCloseTo((1 + 1) / 3, 5);

    const empty = computeGritFactor(repos, "ghost");
    expect(empty.sample_size).toBe(0);
    expect(empty.value).toBeNull();
    expect(empty.long_term_count).toBe(0);
    expect(empty.gem_count).toBe(0);
    expect(empty.churn_count).toBe(0);
  });

  it("wires Grit Factor into analyzeAll profile", () => {
    const login = "self";
    const repos: RepoRecord[] = [
      // longTerm
      makeRepo("self", "a", 10, "2024-04-10T00:00:00Z"),
      // churn
      makeRepo("self", "b", 0, "2024-01-15T00:00:00Z"),
    ];

    const result = analyzeAll({ login, repos, prs: [], commits: [], tzOverride: "+00:00" });

    expect(result.profile.grit_factor.sample_size).toBe(2);
    expect(result.profile.grit_factor.long_term_count).toBe(1);
    expect(result.profile.grit_factor.gem_count).toBe(0);
    expect(result.profile.grit_factor.churn_count).toBe(1);
    expect(result.profile.grit_factor.value).not.toBeNull();
    expect(result.profile.grit_factor.value!).toBeCloseTo(0.5, 5);
  });

  it("computes Fork Destiny for contributor, variant and noise forks", () => {
    const login = "self";
    const repos: RepoRecord[] = [
      { ...makeRepo("self", "fork-contrib", 10, "2024-01-01T00:00:00Z"), isFork: true },
      { ...makeRepo("self", "fork-variant", 100, "2024-01-01T00:00:00Z"), isFork: true },
      { ...makeRepo("self", "fork-noise", 0, "2024-01-01T00:00:00Z"), isFork: true }
    ];

    const commits: CommitRecord[] = [
      makeCommit("2024-01-01T00:00:00Z", {
        repo: { owner: "self", name: "fork-contrib", isOwn: true },
        associatedPRs: [
          {
            number: 1,
            url: "https://example.com/pr/1",
            state: "MERGED",
            isMerged: true,
            baseRef: "main",
            headRef: "feature",
            isCrossRepository: true,
            createdAt: "2024-01-01T00:00:00Z",
            mergedAt: "2024-01-02T00:00:00Z",
            closedAt: "2024-01-02T00:00:00Z",
            baseRepo: {
              owner: "upstream",
              name: "core",
              stargazerCount: 200,
              totalPrCount: 10,
              defaultBranch: "main"
            },
            headRepo: {
              owner: "self",
              name: "fork-contrib",
              stargazerCount: 10,
              totalPrCount: 1,
              isFork: true
            }
          }
        ]
      })
    ];

    const result = computeForkDestiny(repos, commits, login);
    expect(result.total_forks).toBe(3);
    expect(result.contributor_forks).toBe(1);
    expect(result.variant_forks).toBe(1);
    expect(result.noise_forks).toBe(1);
    expect(result.total_fork_stars).toBe(10 + 100 + 0);
    expect(result.variant_fork_stars).toBe(100);

    const tags = computeProfileTags(result, { talk_events: 0, code_events: 0, value: null, sample_size: 0 });
    expect(tags).toContain("hard_forker");
    expect(tags).toContain("variant_leader");
    expect(tags).not.toContain("fork_cleaner");
  });

  it("computes Community Engagement from contributions summary and wires into analyzeAll", () => {
    const contributions: ContributionsSummary = {
      totalCommitContributions: 10,
      totalIssueContributions: 30,
      totalPullRequestContributions: 5,
      totalPullRequestReviewContributions: 15,
      totalRepositoriesWithContributedCommits: 1,
      totalRepositoriesWithContributedIssues: 1,
      totalRepositoriesWithContributedPullRequests: 1,
      totalRepositoriesWithContributedPullRequestReviews: 1,
      totalRepositoryContributions: 2,
      restrictedContributionsCount: 0,
      contributionCalendar: {
        totalContributions: 0,
        colors: [],
        weeks: []
      },
      startedAt: "2024-01-01T00:00:00Z",
      endedAt: "2024-12-31T23:59:59Z"
    };

    const empty = computeCommunityEngagement(null);
    expect(empty.sample_size).toBe(0);
    expect(empty.value).toBeNull();

    const ce = computeCommunityEngagement(contributions);
    expect(ce.talk_events).toBe(30 + 15);
    expect(ce.code_events).toBe(10 + 5 + 2);
    expect(ce.sample_size).toBe(30 + 15 + 10 + 5 + 2);
    expect(ce.value).not.toBeNull();
    expect(ce.value!).toBeCloseTo((30 + 15) / (30 + 15 + 10 + 5 + 2), 5);

    const result = analyzeAll({
      login: "self",
      repos: [],
      prs: [],
      commits: [],
      contributions,
      tzOverride: "+00:00"
    });

    expect(result.profile.community_engagement.talk_events).toBe(30 + 15);
    expect(result.profile.community_engagement.code_events).toBe(10 + 5 + 2);
    expect(result.profile.community_engagement.sample_size).toBe(30 + 15 + 10 + 5 + 2);
    expect(result.profile.community_engagement.value).toBeCloseTo((30 + 15) / (30 + 15 + 10 + 5 + 2), 5);
    expect(result.profile.contributions).toEqual(contributions);

    // 根据 Talk vs Code 的比例打标签
    expect(result.profile.tags.length).toBeGreaterThan(0);
    expect(result.profile.tags).toContain("talker");
  });
});


describe("analyzeProfileReadme", () => {
  it("returns none when markdown is null", () => {
    const result = analyzeProfileReadme(null);
    expect(result.style).toBe("none");
    expect(result.markdown).toBeNull();
    expect(result.plain_text).toBeNull();
    expect(result.text_excerpt).toBeNull();
    expect(result.image_alt_texts).toEqual([]);
  });

  it("classifies empty or whitespace markdown as empty", () => {
    const result = analyzeProfileReadme("   \n\n  ");
    expect(result.style).toBe("empty");
    expect(result.markdown).toBe("");
    expect(result.plain_text).toBe("");
    expect(result.text_excerpt).toBeNull();
    expect(result.image_alt_texts).toEqual([]);
  });

  it("detects one-liner style", () => {
    const md = "I like deep neural nets.";
    const result = analyzeProfileReadme(md);
    expect(result.style).toBe("one_liner");
    expect(result.markdown).toBe(md);
    expect(result.plain_text).toBe("I like deep neural nets.");
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
    expect(result.plain_text).toBeNull();
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
    expect(result.plain_text).toContain("Hi, I'm Alice");
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
    expect(result.plain_text).toContain("full-stack developer");
    expect(result.text_excerpt).toContain("full-stack developer");
    expect(result.image_alt_texts).toEqual(["Badge"]);
  });
});




describe("computeReadmeConsistency", () => {
  it("computes strong language consistency and matches owned repos", () => {
    const md = [
      "# Hi",
      "",
      "I work mainly with TypeScript and Rust.",
      "",
      "- https://github.com/self/a"
    ].join("\n");

    const readme = analyzeProfileReadme(md);
    const skills = [
      { lang: "TypeScript", weight: 0.6 },
      { lang: "Rust", weight: 0.4 }
    ];
    const repos: RepoRecord[] = [
      makeRepo("self", "a", 10, "2024-01-02T00:00:00Z"),
      makeRepo("self", "b", 5, "2024-01-03T00:00:00Z")
    ];

    const c = computeReadmeConsistency(readme, skills, "self", repos);

    expect(c.readme_languages).toEqual(expect.arrayContaining(["TypeScript", "Rust"]));
    expect(c.metric_languages).toEqual(["TypeScript", "Rust"]);
    expect(c.language_overlap).toEqual(expect.arrayContaining(["TypeScript", "Rust"]));
    expect(c.readme_language_supported_ratio).toBeCloseTo(1, 5);
    expect(c.readme_vs_skills_consistency).toBe("strong");

    expect(c.owned_repos_mentioned).toEqual(expect.arrayContaining(["self/a"]));
    expect(c.owned_repos_found_in_data).toEqual(["self/a"]);
    expect(c.owned_repos_missing_in_data).toEqual([]);
  });

  it("computes poor or unknown consistency when README languages diverge or are absent", () => {
    // README 声称使用 Haskell/Rust，但行为数据只有 TypeScript
    const mdPoor = "I mainly use Haskell and Rust.";
    const readmePoor = analyzeProfileReadme(mdPoor);
    const skills: { lang: string; weight: number }[] = [{ lang: "TypeScript", weight: 1 }];
    const repos: RepoRecord[] = [makeRepo("self", "a", 10, "2024-01-02T00:00:00Z")];

    const cPoor = computeReadmeConsistency(readmePoor, skills, "self", repos);
    expect(cPoor.readme_languages.length).toBeGreaterThan(0);
    expect(cPoor.language_overlap.length).toBe(0);
    expect(cPoor.readme_language_supported_ratio).toBeCloseTo(0, 5);
    expect(cPoor.readme_vs_skills_consistency).toBe("poor");

    // README 为纯仪表盘，没有明确语言自述
    const mdUnknown = [
      "![GitHub Stats](https://example.com/stats.svg)",
      "![Top Langs](https://example.com/langs.svg)"
    ].join("\n");
    const readmeUnknown = analyzeProfileReadme(mdUnknown);
    const cUnknown = computeReadmeConsistency(readmeUnknown, skills, "self", repos);

    expect(cUnknown.readme_languages.length).toBe(0);
    expect(cUnknown.readme_language_supported_ratio).toBeNull();
    expect(cUnknown.readme_vs_skills_consistency).toBe("unknown");
  });

  it("correctly extracts C# and maps JavaScript ecosystem keywords", () => {
    // 测试 C# 提取（修复 \bC#\b 的 bug）
    const mdCSharp = "Fluent: PHP, C#, Python, C, C++";
    const readmeCSharp = analyzeProfileReadme(mdCSharp);
    const skillsCSharp = [
      { lang: "PHP", weight: 0.5 },
      { lang: "C#", weight: 0.3 },
      { lang: "Python", weight: 0.2 }
    ];
    const repos: RepoRecord[] = [makeRepo("self", "a", 10, "2024-01-02T00:00:00Z")];

    const cCSharp = computeReadmeConsistency(readmeCSharp, skillsCSharp, "self", repos);

    // 验证 C#、C、C++ 都被正确提取
    expect(cCSharp.readme_languages).toContain("C#");
    expect(cCSharp.readme_languages).toContain("C");
    expect(cCSharp.readme_languages).toContain("C++");
    expect(cCSharp.readme_languages).toContain("PHP");
    expect(cCSharp.readme_languages).toContain("Python");

    // 验证一致性计算
    expect(cCSharp.language_overlap).toContain("C#");
    expect(cCSharp.language_overlap).toContain("PHP");
    expect(cCSharp.language_overlap).toContain("Python");

    // 测试 JavaScript 生态关键词映射
    const mdJS = "I work with Node.js, Next.js, Vue, and React.";
    const readmeJS = analyzeProfileReadme(mdJS);
    const skillsJS = [{ lang: "JavaScript", weight: 0.8 }, { lang: "TypeScript", weight: 0.2 }];

    const cJS = computeReadmeConsistency(readmeJS, skillsJS, "self", repos);

    // 验证 Node.js / Next.js / Vue / React 都被映射到 JavaScript
    expect(cJS.readme_languages).toContain("JavaScript");
    expect(cJS.language_overlap).toContain("JavaScript");
    expect(cJS.readme_vs_skills_consistency).toBe("strong");
  });
});

describe("v0.0.9: computeLanguageWeightsV2 and computeTopicWeights", () => {
  it("computes language weights based on full languages data", () => {
    const repos: RepoRecord[] = [
      {
        ...makeRepo("self", "a", 100, "2024-01-02T00:00:00Z"),
        languages: {
          edges: [
            { size: 8000, node: { name: "TypeScript" } },
            { size: 2000, node: { name: "JavaScript" } }
          ]
        }
      },
      {
        ...makeRepo("self", "b", 50, "2024-01-03T00:00:00Z"),
        languages: {
          edges: [
            { size: 5000, node: { name: "Python" } }
          ]
        }
      }
    ];

    const weights = computeLanguageWeightsV2(repos);

    // 验证返回了所有语言
    expect(weights.length).toBe(3);
    expect(weights.map(w => w.lang)).toContain("TypeScript");
    expect(weights.map(w => w.lang)).toContain("JavaScript");
    expect(weights.map(w => w.lang)).toContain("Python");

    // 验证权重总和为 1
    const totalWeight = weights.reduce((sum, w) => sum + w.weight, 0);
    expect(totalWeight).toBeCloseTo(1, 5);

    // 验证 TypeScript 权重最高（因为 repo a 有 100 stars，且 TypeScript 占 80%）
    const tsWeight = weights.find(w => w.lang === "TypeScript");
    expect(tsWeight).toBeDefined();
    expect(tsWeight!.weight).toBeGreaterThan(0.5);
  });

  it("computes topic weights based on repositoryTopics data", () => {
    const repos: RepoRecord[] = [
      {
        ...makeRepo("self", "a", 100, "2024-01-02T00:00:00Z"),
        repositoryTopics: {
          nodes: [
            { topic: { name: "react" } },
            { topic: { name: "typescript" } }
          ]
        }
      },
      {
        ...makeRepo("self", "b", 50, "2024-01-03T00:00:00Z"),
        repositoryTopics: {
          nodes: [
            { topic: { name: "react" } },
            { topic: { name: "nextjs" } }
          ]
        }
      }
    ];

    const weights = computeTopicWeights(repos);

    // 验证返回了所有 topics
    expect(weights.length).toBe(3);
    expect(weights.map(w => w.topic)).toContain("react");
    expect(weights.map(w => w.topic)).toContain("typescript");
    expect(weights.map(w => w.topic)).toContain("nextjs");

    // 验证权重总和为 1
    const totalWeight = weights.reduce((sum, w) => sum + w.weight, 0);
    expect(totalWeight).toBeCloseTo(1, 5);

    // 验证 react 权重最高（因为出现在两个仓库中）
    const reactWeight = weights.find(w => w.topic === "react");
    expect(reactWeight).toBeDefined();
    expect(reactWeight!.count).toBe(2);
    expect(reactWeight!.weight).toBeGreaterThan(0.4);
  });

  it("extracts topics from README and compares with metric topics", () => {
    const md = [
      "# Hi",
      "",
      "I work with React, Docker, and Kubernetes.",
      ""
    ].join("\n");

    const readme = analyzeProfileReadme(md);
    const skills = [{ lang: "JavaScript", weight: 1 }];
    const repos: RepoRecord[] = [
      {
        ...makeRepo("self", "a", 10, "2024-01-02T00:00:00Z"),
        repositoryTopics: {
          nodes: [
            { topic: { name: "react" } },
            { topic: { name: "docker" } }
          ]
        }
      }
    ];

    const c = computeReadmeConsistency(readme, skills, "self", repos);

    // 验证 README topics 提取
    expect(c.readme_topics).toContain("react");
    expect(c.readme_topics).toContain("docker");
    expect(c.readme_topics).toContain("kubernetes");

    // 验证 metric topics 提取
    expect(c.metric_topics).toContain("react");
    expect(c.metric_topics).toContain("docker");

    // 验证 topic overlap
    expect(c.topic_overlap).toContain("react");
    expect(c.topic_overlap).toContain("docker");
    expect(c.topic_overlap).not.toContain("kubernetes"); // kubernetes 不在 metric_topics 中
  });
});
