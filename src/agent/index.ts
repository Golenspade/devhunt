/**
 * AI Agent 导读模块
 *
 * 基于已分析完成的 profile.json 数据，调用 LLM 生成自然语言导读。
 * 帮助用户快速理解开发者画像的关键洞察。
 */

import type { ProfileJSON } from "../types/profile";

/**
 * AI 导读请求选项
 */
export interface NarrateOptions {
  /** 导读语言（默认中文） */
  language?: "zh" | "en";
  /** 导读风格 */
  style?: "professional" | "casual" | "brief";
  /** 自定义 system prompt（可选） */
  systemPrompt?: string;
}

/**
 * AI 导读结果
 */
export interface NarrateResult {
  /** 生成的导读文本 */
  narrative: string;
  /** 使用的 token 数量（如果可用） */
  tokensUsed?: number;
}

/**
 * 将 profile.json 压缩为 AI 可消费的精简格式
 * 去除冗余字段，保留关键洞察数据
 */
export function compressProfileForAI(profile: ProfileJSON): object {
  return {
    // 基本信息
    login: profile.login,
    bio: profile.bio,
    company: profile.company,
    location: profile.location,
    followers: profile.followers,
    organizations: profile.organizations?.map((o) => o.login) ?? [],

    // 标签（AI 可直接使用的 archetype）
    tags: profile.tags,

    // 技能分布（Top 5）
    top_skills: profile.skills?.slice(0, 5).map((s) => ({
      lang: s.lang,
      weight: Math.round(s.weight * 100) + "%",
    })),

    // 关键指标
    metrics: {
      // 上游倾向（0=纯 creator, 1=纯 collaborator）
      uoi: profile.uoi !== null ? Math.round(profile.uoi * 100) + "%" : null,
      uoi_sample: profile.uoi_sample_size,

      // 外部 PR 合并率
      external_pr_accept_rate:
        profile.external_pr_accept_rate !== null
          ? Math.round(profile.external_pr_accept_rate * 100) + "%"
          : null,
      external_pr_sample: profile.external_pr_sample_size,

      // 熬夜率
      night_ratio:
        profile.night_ratio !== null
          ? Math.round(profile.night_ratio * 100) + "%"
          : null,

      // 专注率
      focus_ratio:
        profile.focus_ratio !== null
          ? Math.round(profile.focus_ratio * 100) + "%"
          : null,

      // Uni Index（协作光谱）
      uni_index:
        profile.uni_index?.value !== null
          ? Math.round(profile.uni_index.value * 100) + "%"
          : null,
    },

    // Grit Factor（交付率）
    grit_factor: profile.grit_factor
      ? {
          value:
            profile.grit_factor.value !== null
              ? Math.round(profile.grit_factor.value * 100) + "%"
              : null,
          long_term: profile.grit_factor.long_term_count,
          gem: profile.grit_factor.gem_count,
          churn: profile.grit_factor.churn_count,
        }
      : null,

    // Fork Destiny（fork 宿命）
    fork_destiny: profile.fork_destiny
      ? {
          total: profile.fork_destiny.total_forks,
          contributor: profile.fork_destiny.contributor_forks,
          variant: profile.fork_destiny.variant_forks,
          noise: profile.fork_destiny.noise_forks,
        }
      : null,

    // Community Engagement（社区参与度）
    community_engagement: profile.community_engagement
      ? {
          talk_vs_code:
            profile.community_engagement.value !== null
              ? Math.round(profile.community_engagement.value * 100) + "%"
              : null,
          talk_events: profile.community_engagement.talk_events,
          code_events: profile.community_engagement.code_events,
        }
      : null,

    // Contribution Momentum（贡献动量）
    momentum: profile.contribution_momentum
      ? {
          status: profile.contribution_momentum.status,
          recent_quarter: profile.contribution_momentum.recent_quarter_total,
          year_total: profile.contribution_momentum.year_total,
        }
      : null,

    // 活跃时段
    core_hours: profile.core_hours,
  };
}

/**
 * 构建导读用的 System Prompt
 */
export function buildSystemPrompt(
  options: NarrateOptions = {}
): string {
  const { language = "zh", style = "professional" } = options;

  if (options.systemPrompt) {
    return options.systemPrompt;
  }

  const langInstructions =
    language === "zh"
      ? "请用中文撰写导读。"
      : "Please write the narrative in English.";

  const styleInstructions = {
    professional:
      "使用专业但易懂的语言，像一位资深技术招聘顾问在向团队介绍候选人。",
    casual: "使用轻松友好的语言，像朋友间聊天一样介绍这位开发者。",
    brief: "简明扼要，用 3-5 句话概括核心特点。",
  };

  return `你是 DevHunt 的 AI 分析师，专门解读 GitHub 开发者画像数据。

${langInstructions}
${styleInstructions[style]}

你的任务是基于提供的画像数据，生成一段自然语言导读，帮助读者快速理解这位开发者的特点。

导读应该包含以下方面（根据数据可用性灵活调整）：
1. **身份速写**：一句话概括这位开发者是谁（基于 bio、company、tags）
2. **技术栈**：主要使用的编程语言和技术（基于 top_skills）
3. **协作风格**：是独立创作者还是社区协作者（基于 uoi、uni_index、fork_destiny）
4. **交付能力**：项目完成度和持续性（基于 grit_factor）
5. **活跃状态**：当前的贡献节奏（基于 momentum）
6. **工作习惯**：活跃时段、熬夜率等（基于 core_hours、night_ratio）

注意事项：
- 数据为 null 的字段表示样本不足，不要臆测
- 使用具体数字时要附带样本量说明
- 避免过度解读，保持客观中立
- 如果 tags 包含 archetype 标签（如 hard_forker、silent_maker），可以用来辅助描述风格`;
}

/**
 * 构建导读用的 User Prompt
 */
export function buildUserPrompt(profile: ProfileJSON): string {
  const compressed = compressProfileForAI(profile);
  return `请为以下 GitHub 用户生成画像导读：

\`\`\`json
${JSON.stringify(compressed, null, 2)}
\`\`\`

请生成一段 200-400 字的自然语言导读。`;
}

/**
 * 调用 AI 生成导读（通用接口）
 *
 * 这是一个抽象接口，具体实现需要传入 LLM 调用函数。
 * 支持 OpenAI、Azure OpenAI、本地 Ollama 等。
 */
export async function narrateProfile(
  profile: ProfileJSON,
  callLLM: (systemPrompt: string, userPrompt: string) => Promise<string>,
  options: NarrateOptions = {}
): Promise<NarrateResult> {
  const systemPrompt = buildSystemPrompt(options);
  const userPrompt = buildUserPrompt(profile);

  const narrative = await callLLM(systemPrompt, userPrompt);

  return { narrative };
}

/**
 * 使用 OpenAI 兼容 API 生成导读
 */
export async function narrateWithOpenAI(
  profile: ProfileJSON,
  apiKey: string,
  options: NarrateOptions & {
    baseUrl?: string;
    model?: string;
  } = {}
): Promise<NarrateResult> {
  const {
    baseUrl = "https://api.openai.com/v1",
    model = "gpt-4o-mini",
    ...narrateOptions
  } = options;

  const systemPrompt = buildSystemPrompt(narrateOptions);
  const userPrompt = buildUserPrompt(profile);

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 1000,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${response.status} - ${error}`);
  }

  const data = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
    usage?: { total_tokens?: number };
  };
  const narrative = data.choices?.[0]?.message?.content ?? "";
  const tokensUsed = data.usage?.total_tokens;

  return { narrative, tokensUsed };
}
