export type EmailTld = ".edu" | ".gov" | ".org" | "other";

export interface EmailInfo {
  emailDomain: string | null;
  emailTld: EmailTld;
}

export function parseEmailInfo(email: string | null | undefined): EmailInfo {
  if (!email) {
    return { emailDomain: null, emailTld: "other" };
  }

  const at = email.lastIndexOf("@");
  if (at === -1 || at === email.length - 1) {
    return { emailDomain: null, emailTld: "other" };
  }

  const domain = email.slice(at + 1).toLowerCase();

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

