import type { ProfileJSON } from "../types/profile";

/**
 * 标签系统 v0：基于 Fork Destiny + Community Engagement 推导出高层标签。
 *
 * 设计原则：
 * - 完全基于已经计算好的数值指标，不重复扫原始数据；
 * - 只做“描述型”标签（archetype），不做价值判断；
 * - 所有标签均为 machine-friendly slug，UI 可自行映射为 emoji / 文案。
 */

// 为了方便复用，直接从 ProfileJSON 中取子类型。
export type ForkDestinySummary = ProfileJSON["fork_destiny"];
export type CommunityEngagementSummary = ProfileJSON["community_engagement"];

/**
 * 基于 Fork Destiny 与 Community Engagement 计算标签列表。
 *
 * 当前标签集合（v0）：
 * - hard_forker      : 存在至少一个被上游合并的自有 fork
 * - variant_leader   : 存在至少一个高 star、未被合并的自有 fork
 * - fork_cleaner     : 有较多 fork，但全部为 noise（既未合并也无 star）
 * - silent_maker     : Talk 比例很低，主要靠代码说话
 * - vocal_contributor: Talk / Code 比例居中，既写代码又参与社区讨论
 * - talker           : Talk 比例很高，更偏 triager / PM / reviewer
 */
export function computeProfileTags(
  fork: ForkDestinySummary,
  community: CommunityEngagementSummary,
): string[] {
  const tags: string[] = [];

  // --- Fork 维度标签 ---
  if (fork.total_forks > 0) {
    // 至少有一个被合并到上游的 fork → Hard Forker
    if (fork.contributor_forks > 0) {
      tags.push("hard_forker");
    }

    // 至少有一个高 star 且未被合并的 fork → Variant Leader
    if (fork.variant_forks > 0) {
      tags.push("variant_leader");
    }

    // 绝大多数 fork 都是 noise，且没有 contributor / variant → Fork Cleaner
    const noiseRatio = fork.total_forks > 0 ? fork.noise_forks / fork.total_forks : 0;
    if (
      fork.total_forks >= 3 &&
      fork.contributor_forks === 0 &&
      fork.variant_forks === 0 &&
      noiseRatio >= 0.8
    ) {
      tags.push("fork_cleaner");
    }
  }

  // --- 社区行为维度标签（Talk vs Code） ---
  const v = community.value;
  const sampleSize = community.sample_size;
  const MIN_SAMPLE = 10; // 样本过少时不打行为标签，避免过拟合偶然事件

  if (v !== null && sampleSize >= MIN_SAMPLE) {
    if (v <= 0.2) {
      // 绝大多数行为是代码侧事件
      tags.push("silent_maker");
    } else if (v >= 0.6) {
      // 绝大多数行为是 talk 侧事件（issue/review）
      tags.push("talker");
    } else {
      // 中间地带：既写代码也参与讨论
      tags.push("vocal_contributor");
    }
  }

  return tags;
}

