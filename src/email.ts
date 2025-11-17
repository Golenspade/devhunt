/**
 * 邮箱顶级域名（TLD）分类
 *
 * 用于识别开发者的邮箱所属机构类型，辅助分析开发者背景。
 *
 * - ".edu": 教育机构邮箱（如大学、学院）
 * - ".gov": 政府机构邮箱
 * - ".org": 非营利组织邮箱
 * - "other": 其他类型（如商业邮箱、个人邮箱等）
 *
 * 参考文档：CHANGELOG.md v0.0.4 中的邮箱解析功能
 */
export type EmailTld = ".edu" | ".gov" | ".org" | "other";

/**
 * 邮箱信息解析结果
 *
 * 包含邮箱的域名和顶级域名分类信息。
 */
export interface EmailInfo {
  /**
   * 邮箱域名（@ 符号后的部分）
   *
   * 例如：
   * - "example@gmail.com" -> "gmail.com"
   * - "student@university.edu" -> "university.edu"
   * - 无效邮箱 -> null
   */
  emailDomain: string | null;

  /**
   * 邮箱顶级域名分类
   *
   * 用于快速识别开发者所属机构类型。
   */
  emailTld: EmailTld;
}

/**
 * 解析邮箱信息
 *
 * 从邮箱地址中提取域名和顶级域名分类。
 * 用于 commit 记录中的作者邮箱分析，辅助判断开发者背景。
 *
 * @param email - 邮箱地址字符串（可为 null 或 undefined）
 * @returns 包含域名和 TLD 分类的 EmailInfo 对象
 *
 * @example
 * ```typescript
 * parseEmailInfo("student@mit.edu")
 * // => { emailDomain: "mit.edu", emailTld: ".edu" }
 *
 * parseEmailInfo("developer@github.com")
 * // => { emailDomain: "github.com", emailTld: "other" }
 *
 * parseEmailInfo(null)
 * // => { emailDomain: null, emailTld: "other" }
 * ```
 *
 * 设计理念：
 * - 教育机构邮箱（.edu）可能暗示学生或学术背景
 * - 政府机构邮箱（.gov）可能暗示公共部门工作经历
 * - 非营利组织邮箱（.org）可能暗示开源社区参与
 * - 这些信息可用于"行为代理"分析（参考 pod.md 中的多镜头分析）
 */
export function parseEmailInfo(email: string | null | undefined): EmailInfo {
  // 处理空值情况
  if (!email) {
    return { emailDomain: null, emailTld: "other" };
  }

  // 查找 @ 符号位置
  const at = email.lastIndexOf("@");
  if (at === -1 || at === email.length - 1) {
    // 无效邮箱格式（无 @ 或 @ 在末尾）
    return { emailDomain: null, emailTld: "other" };
  }

  // 提取域名部分并转为小写
  const domain = email.slice(at + 1).toLowerCase();

  // 识别顶级域名分类
  let tld: EmailTld = "other";
  if (domain.endsWith(".edu")) {
    tld = ".edu";
  } else if (domain.endsWith(".gov")) {
    tld = ".gov";
  } else if (domain.endsWith(".org")) {
    tld = ".org";
  }

  return { emailDomain: domain, emailTld: tld };
}

