import type { RepoRecord } from "../types/github";
import type {
  ProfileReadmeAnalysis,
  ProfileReadmeStyle,
  ConsistencySignals
} from "../types/profile";

/**
 * 分析 Profile README
 *
 * 识别开发者的 GitHub Profile README 风格，并提取文本和图片信息。
 */
export function analyzeProfileReadme(markdown: string | null): ProfileReadmeAnalysis {
  // 处理 null 情况（没有 Profile README）
  if (markdown == null) {
    return {
      style: "none",
      markdown: null,
      plain_text: null,
      text_excerpt: null,
      image_alt_texts: []
    };
  }

  const raw = markdown;
  const trimmed = raw.trim();

  // 处理空字符串情况
  if (!trimmed) {
    return {
      style: "empty",
      markdown: "",
      plain_text: "",
      text_excerpt: null,
      image_alt_texts: []
    };
  }

  // 提取图片的 alt 文本
  const imageAltTexts: string[] = [];

  // 提取 Markdown 图片语法：![alt](url)
  const imageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
  let match: RegExpExecArray | null;
  while ((match = imageRegex.exec(raw)) !== null) {
    const alt = match[1]?.trim();
    if (alt) imageAltTexts.push(alt);
  }

  // 提取 HTML img 标签的 alt 属性
  const imgTagRegex = /<img[^>]*alt=["']([^"']+)["'][^>]*>/gi;
  while ((match = imgTagRegex.exec(raw)) !== null) {
    const alt = match[1]?.trim();
    if (alt) imageAltTexts.push(alt);
  }

  // 提取纯文本内容（去除 Markdown 格式）
  const lines = raw.split(/\r?\n/);
  const textLines: string[] = [];

  for (const line of lines) {
    const stripped = stripMarkdownFormatting(line).trim();
    if (stripped.length === 0) continue;
    textLines.push(stripped);
  }

  const textCharCount = textLines.reduce((sum, l) => sum + l.length, 0);
  const imageCount = imageAltTexts.length;
  const plainText = textLines.length === 0 ? null : textLines.join("\n");

  // 根据文本和图片数量判断风格
  let style: ProfileReadmeStyle;

  if (textLines.length <= 1 && textCharCount <= 140 && imageCount === 0) {
    style = "one_liner";
  } else if (imageCount > 0 && imageCount >= textLines.length) {
    style = "visual_dashboard";
  } else if (textLines.length >= 2 && textCharCount >= 80 && imageCount === 0) {
    style = "short_bio";
  } else {
    style = "mixed";
  }

  const textExcerpt = plainText == null ? null : plainText.slice(0, 400);

  return {
    style,
    markdown: raw,
    plain_text: plainText,
    text_excerpt: textExcerpt,
    image_alt_texts: imageAltTexts
  };
}
const KNOWN_LANGUAGES = [
  "TypeScript",
  "JavaScript",
  "Python",
  "Go",
  "Rust",
  "Java",
  "C++",
  "C#",
  "C",
  "Ruby",
  "PHP",
  "Kotlin",
  "Swift",
  "Scala",
  "Haskell",
  "Elixir",
  "Clojure",
  "Dart",
  "Objective-C",
  "Shell",
  "Bash",
  "Lua"
] as const;

const JS_ECOSYSTEM_KEYWORDS = [
  "Node.js",
  "Node",
  "Next.js",
  "Next",
  "Vue.js",
  "Vue",
  "React.js",
  "React",
  "Svelte",
  "Angular",
  "Nuxt.js",
  "Nuxt",
  "Express.js",
  "Express",
  "Nest.js",
  "NestJS"
] as const;

function extractReadmeLanguages(readme: ProfileReadmeAnalysis): string[] {
  const texts: string[] = [];

  if (readme.plain_text) {
    texts.push(readme.plain_text);
  }

  if (readme.image_alt_texts && readme.image_alt_texts.length > 0) {
    texts.push(readme.image_alt_texts.join(" "));
  }

  if (texts.length === 0 && readme.markdown) {
    texts.push(readme.markdown);
  }

  if (texts.length === 0) {
    return [];
  }

  const haystack = texts.join("\n");
  const found = new Set<string>();

  for (const lang of KNOWN_LANGUAGES) {
    let pattern: RegExp;

    switch (lang) {
      case "C++":
        pattern = /\bC\+\+(?=\s|,|;|\.|$)/i;
        break;
      case "C#":
        pattern = /\bC#(?=\s|,|;|\.|$)/i;
        break;
      case "C":
        pattern = /\bC(?![+#])(?=\s|,|;|\.|$)/i;
        break;
      case "Objective-C":
        pattern = /\bObjective-C\b/i;
        break;
      default:
        pattern = new RegExp(`\\b${lang}\\b`, "i");
        break;
    }

    if (pattern.test(haystack)) {
      found.add(lang);
    }
  }

  for (const keyword of JS_ECOSYSTEM_KEYWORDS) {
    const escaped = keyword.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&");
    const pattern = new RegExp(`\\b${escaped}\\b`, "i");

    if (pattern.test(haystack)) {
      found.add("JavaScript");
      break;
    }
  }

  return Array.from(found);
}

function extractReadmeTopics(readme: ProfileReadmeAnalysis): string[] {
  const texts: string[] = [];

  if (readme.plain_text) {
    texts.push(readme.plain_text);
  }

  if (readme.image_alt_texts && readme.image_alt_texts.length > 0) {
    texts.push(readme.image_alt_texts.join(" "));
  }

  if (texts.length === 0 && readme.markdown) {
    texts.push(readme.markdown);
  }

  if (texts.length === 0) {
    return [];
  }

  const haystack = texts.join("\n").toLowerCase();
  const found = new Set<string>();

  const KNOWN_TOPICS = [
    "react",
    "vue",
    "angular",
    "svelte",
    "next.js",
    "nuxt",
    "gatsby",
    "express",
    "fastify",
    "koa",
    "nest",
    "django",
    "flask",
    "fastapi",
    "rails",
    "spring",
    "laravel",
    "react-native",
    "flutter",
    "ionic",
    "xamarin",
    "postgresql",
    "mysql",
    "mongodb",
    "redis",
    "elasticsearch",
    "sqlite",
    "cassandra",
    "aws",
    "azure",
    "gcp",
    "vercel",
    "netlify",
    "heroku",
    "digitalocean",
    "docker",
    "kubernetes",
    "k8s",
    "helm",
    "terraform",
    "github-actions",
    "gitlab-ci",
    "jenkins",
    "circleci",
    "travis-ci",
    "jest",
    "mocha",
    "pytest",
    "junit",
    "cypress",
    "selenium",
    "webpack",
    "vite",
    "rollup",
    "esbuild",
    "parcel",
    "babel",
    "npm",
    "yarn",
    "pnpm",
    "pip",
    "cargo",
    "maven",
    "gradle",
    "graphql",
    "rest",
    "grpc",
    "websocket",
    "oauth",
    "jwt",
    "tensorflow",
    "pytorch",
    "scikit-learn",
    "keras",
    "pandas",
    "numpy",
    "ethereum",
    "solidity",
    "web3",
    "blockchain",
    "unity",
    "unreal",
    "godot"
  ];

  for (const topic of KNOWN_TOPICS) {
    const escaped = topic.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&");
    const pattern = new RegExp(`\\b${escaped}\\b`, "i");

    if (pattern.test(haystack)) {
      found.add(topic);
    }
  }

  return Array.from(found).sort();
}

function extractOwnedRepoMentions(readme: ProfileReadmeAnalysis, login: string): string[] {
  const markdown = readme.markdown;
  if (!markdown || !login) return [];

  const ownerLower = login.toLowerCase();
  const ownerPattern = ownerLower.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&");
  const regex = new RegExp(`https://github\\.com/${ownerPattern}/([A-Za-z0-9_.-]+)`, "gi");

  const result = new Set<string>();
  let match: RegExpExecArray | null;

  while ((match = regex.exec(markdown)) !== null) {
    const repoName = match[1];
    if (!repoName) continue;
    result.add(`${ownerLower}/${repoName.toLowerCase()}`);
  }

  return Array.from(result);
}

export function computeReadmeConsistency(
  readme: ProfileReadmeAnalysis,
  skills: { lang: string; weight: number }[],
  login: string,
  repos: RepoRecord[]
): ConsistencySignals {
  const readmeLanguages = extractReadmeLanguages(readme);
  const metricLanguages = skills.map((s) => s.lang);
  const metricLanguageSet = new Set(metricLanguages.map((l) => l.toLowerCase()));

  const languageOverlap: string[] = [];
  for (const lang of readmeLanguages) {
    if (metricLanguageSet.has(lang.toLowerCase())) {
      languageOverlap.push(lang);
    }
  }

  let supportedRatio: number | null = null;
  if (readmeLanguages.length > 0) {
    supportedRatio = languageOverlap.length / readmeLanguages.length;
  }

  let consistencyLevel: ConsistencySignals["readme_vs_skills_consistency"];
  if (supportedRatio == null) {
    consistencyLevel = "unknown";
  } else if (supportedRatio >= 0.8) {
    consistencyLevel = "strong";
  } else if (supportedRatio >= 0.4) {
    consistencyLevel = "partial";
  } else {
    consistencyLevel = "poor";
  }

  const ownerLower = login.toLowerCase();
  const ownedReposMentioned = extractOwnedRepoMentions(readme, login);

  const ownedReposInDataSet = new Set(
    repos
      .filter((r) => r.owner.login.toLowerCase() === ownerLower)
      .map((r) => `${ownerLower}/${r.name.toLowerCase()}`)
  );

  const ownedReposFoundInData: string[] = [];
  const ownedReposMissingInData: string[] = [];

  for (const full of ownedReposMentioned) {
    if (ownedReposInDataSet.has(full)) {
      ownedReposFoundInData.push(full);
    } else {
      ownedReposMissingInData.push(full);
    }
  }

  const readmeTopics = extractReadmeTopics(readme);

  const metricTopicsSet = new Set<string>();
  for (const repo of repos) {
    const topics = repo.repositoryTopics?.nodes;
    if (topics) {
      for (const topicNode of topics) {
        metricTopicsSet.add(topicNode.topic.name.toLowerCase());
      }
    }
  }
  const metricTopics = Array.from(metricTopicsSet).sort();

  const topicOverlap: string[] = [];
  for (const topic of readmeTopics) {
    if (metricTopicsSet.has(topic.toLowerCase())) {
      topicOverlap.push(topic);
    }
  }

  return {
    readme_languages: readmeLanguages,
    metric_languages: metricLanguages,
    language_overlap: languageOverlap,
    readme_language_supported_ratio: supportedRatio,
    readme_vs_skills_consistency: consistencyLevel,
    owned_repos_mentioned: ownedReposMentioned,
    owned_repos_found_in_data: ownedReposFoundInData,
    owned_repos_missing_in_data: ownedReposMissingInData,
    readme_topics: readmeTopics,
    metric_topics: metricTopics,
    topic_overlap: topicOverlap
  };
}



/**
 * 去除单行 Markdown 格式，保留纯文本。
 */
function stripMarkdownFormatting(line: string): string {
  let result = line;

  // 完全移除图片语法
  result = result.replace(/!\[[^\]]*\]\([^)]+\)/g, " ");

  // 将链接替换为链接文本
  result = result.replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1");

  // 移除行内代码标记
  result = result.replace(/`([^`]+)`/g, "$1");

  // 移除行首的标题/列表/引用标记
  result = result.replace(/^(\s*[*\-+>]|#{1,6})\s+/g, "");

  // 移除 HTML 标签
  result = result.replace(/<[^>]+>/g, " ");

  return result;
}

