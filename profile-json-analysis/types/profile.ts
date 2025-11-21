/**
 * 前端使用的 Profile 类型定义
 * 与后端 src/types/profile.ts 中的 ProfileJSON 保持一致
 */

export interface ProfileData {
  login: string;
  bio: string | null;
  company: string | null;
  location: string | null;
  websiteUrl: string | null;
  twitterUsername: string | null;
  avatarUrl: string | null;
  followers: number;
  following: number;
  organizations: {
    login: string;
    name: string | null;
    description: string | null;
    websiteUrl: string | null;
  }[];
  tags: string[];
  timezone: {
    auto: string | null;
    override: string | null;
    used: string | null;
  };
  skills: {
    lang: string;
    weight: number;
  }[];
  core_hours: {
    start: string;
    end: string;
  }[];
  uoi: number | null;
  uoi_sample_size: number;
  external_pr_accept_rate: number | null;
  external_pr_sample_size: number;
  uni_index: {
    value: number | null;
    sample_size: number;
    include_org_repos: boolean;
  };
  night_ratio: number | null;
  night_ratio_sample_size: number;
  focus_ratio: number | null;
  focus_ratio_sample_size: number;
  grit_factor: {
    value: number | null;
    sample_size: number;
    long_term_count: number;
    gem_count: number;
    churn_count: number;
  };
  fork_destiny: {
    total_forks: number;
    contributor_forks: number;
    variant_forks: number;
    noise_forks: number;
    total_fork_stars: number;
    variant_fork_stars: number;
  };
  community_engagement: {
    talk_events: number;
    code_events: number;
    value: number | null;
    sample_size: number;
  };
  contribution_momentum: {
    value: number | null;
    recent_quarter_total: number;
    year_total: number;
    baseline_quarter: number;
    status: "accelerating" | "cooling_down" | "steady" | "ghost" | "unknown";
  };
  contributions?: {
    totalContributions: number;
    weeks: {
      contributionDays: {
        date: string;
        contributionCount: number;
      }[];
    }[];
  };
  summary_evidence: {
    sample_prs: string[];
    sample_repos: string[];
  };
}

export interface TopRepo {
  repo: string;
  lang: string | null;
  stars: number;
  score: number;
  isFork: boolean;
  lastPush: string;
  description?: string | null;
}

export interface ApiResponse {
  profile: ProfileData;
  topRepos: TopRepo[];
  hoursHistogram: number[];
}

// 用于 Dashboard 组件的转换后的数据格式
export interface DashboardProfile {
  login: string;
  bio: string;
  company: string | null;
  location: string | null;
  avatarUrl: string | null;
  followers: number;
  following: number;
  tags: string[];
  gritFactor: {
    value: number;
    longTermCount: number;
    gemCount: number;
    churnCount: number;
    sampleSize: number;
  };
  uniIndex: {
    value: number;
    sampleSize: number;
  };
  momentum: "accelerating" | "stable" | "declining";
  velocity: number;
  nightRatio: number;
  focusRatio: number;
  uoi: number;
  externalPrAcceptRate: number;
  skills: {
    lang: string;
    weight: number;
  }[];
}

