import type { AnalyzeOptions, AnalysisResult } from "../types/profile";
import {
  computeLanguageWeights,
  computeHoursHistogram,
  computeCoreHours,
  computeUoi,
  computeExternalPrAcceptRate,
  computeUniIndexV0,
  computeNightRatio,
  computeFocusRatio,
  computeForkDestiny,
  computeCommunityEngagement,
  parseTimezoneOffset,
  buildTimezone,
  buildSummaryEvidence,
} from "./metrics";
import { analyzeProfileReadme, computeReadmeConsistency } from "./nlp";
import { computeProfileTags } from "./tags";

/**
 * 执行完整的开发者画像分析（模块化版本）
 */
export function analyzeAll(options: AnalyzeOptions): AnalysisResult {
  const { login, repos, prs, commits, tzOverride, profileReadmeMarkdown, userInfo, contributions } = options;

  // 计算各项指标
  const langWeights = computeLanguageWeights(repos);
  const tzOffsetMinutes = parseTimezoneOffset(tzOverride);
  const hoursHistogram = computeHoursHistogram(prs, tzOffsetMinutes);
  const coreHours = computeCoreHours(hoursHistogram);
  const uoi = computeUoi(prs, login);
  const externalRate = computeExternalPrAcceptRate(prs, login);
  const uniIndex = computeUniIndexV0(prs, commits, login, userInfo, true);
  const night = computeNightRatio(commits, tzOffsetMinutes);
  const focus = computeFocusRatio(repos);
  const forkDestiny = computeForkDestiny(repos, commits, login);
  const communityEngagement = computeCommunityEngagement(contributions ?? null);
  const tags = computeProfileTags(forkDestiny, communityEngagement);

  const timezone = buildTimezone(tzOverride, tzOffsetMinutes);
  const summary = buildSummaryEvidence(login, repos, prs);
  const readme = analyzeProfileReadme(profileReadmeMarkdown ?? null);
  const consistency = computeReadmeConsistency(readme, langWeights, login, repos);

  // 数据覆盖元信息与样本量（避免将 "no data" 误读为 0）
  const reposTotal = repos.length;
  const prsTotal = prs.length;

  // PR 时间范围（按 createdAt）
  let firstPr: string | null = null;
  let lastPr: string | null = null;
  if (prsTotal > 0) {
    const first = prs[0]!;
    let min = first.createdAt;
    let max = first.createdAt;
    for (const pr of prs) {
      if (pr.createdAt < min) min = pr.createdAt;
      if (pr.createdAt > max) max = pr.createdAt;
    }
    firstPr = min;
    lastPr = max;
  }

  // 仓库时间范围（最早创建和最近 push）
  let firstCreatedAt: string | null = null;
  let lastPushedAt: string | null = null;
  if (reposTotal > 0) {
    const firstRepo = repos[0]!;
    let minCreated = firstRepo.createdAt;
    let maxPushed = firstRepo.pushedAt;
    for (const repo of repos) {
      if (repo.createdAt < minCreated) minCreated = repo.createdAt;
      if (repo.pushedAt && (!maxPushed || repo.pushedAt > maxPushed)) {
        maxPushed = repo.pushedAt;
      }
    }
    firstCreatedAt = minCreated;
    lastPushedAt = maxPushed ?? null;
  }

  // UOI / 外部 PR 合并率 的样本量
  const uoiSampleSize = prsTotal;
  let externalPrSampleSize = 0;
  const lowerLogin = login.toLowerCase();
  for (const pr of prs) {
    const owner = pr.repository.owner.login.toLowerCase();
    if (owner !== lowerLogin) externalPrSampleSize++;
  }

  return {
    profile: {
      login,
      // v0.0.10: 用户基本信息（如果提供）
      bio: userInfo?.bio ?? null,
      company: userInfo?.company ?? null,
      location: userInfo?.location ?? null,
      websiteUrl: userInfo?.websiteUrl ?? null,
      twitterUsername: userInfo?.twitterUsername ?? null,
      followers: userInfo?.followers ?? 0,
      following: userInfo?.following ?? 0,
      organizations: userInfo?.organizations ?? [],
      tags,

      timezone,
      skills: langWeights,
      core_hours: coreHours,
      uoi,
      uoi_sample_size: uoiSampleSize,
      external_pr_accept_rate: externalRate,
      external_pr_sample_size: externalPrSampleSize,
      uni_index: uniIndex,
      night_ratio: night.value,
      night_ratio_sample_size: night.sample_size,
      focus_ratio: focus.value,
      focus_ratio_sample_size: focus.sample_size,
      fork_destiny: forkDestiny,
      community_engagement: communityEngagement,
      summary_evidence: summary,
      contributions,
      readme,
      consistency,
      data_coverage: {
        repos_total: reposTotal,
        prs_total: prsTotal,
        prs_time_range: { first: firstPr, last: lastPr },
        repos_time_range: {
          first_created_at: firstCreatedAt,
          last_pushed_at: lastPushedAt
        }
      }
    },
    hoursHistogram
  };
}

