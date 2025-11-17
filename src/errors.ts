export type DevhuntErrorKind =
  | "network"
  | "auth"
  | "not_found"
  | "analysis"
  | "cli"
  | "unknown";

export class DevhuntError extends Error {
  readonly kind: DevhuntErrorKind;
  readonly details?: unknown;

  constructor(kind: DevhuntErrorKind, message: string, details?: unknown) {
    super(message);
    this.name = "DevhuntError";
    this.kind = kind;
    this.details = details;
  }
}

export class GitHubNetworkError extends DevhuntError {
  constructor(message: string, details?: unknown) {
    super("network", message, details);
    this.name = "GitHubNetworkError";
  }
}

export class GitHubAuthError extends DevhuntError {
  constructor(message: string, details?: unknown) {
    super("auth", message, details);
    this.name = "GitHubAuthError";
  }
}

export class GitHubNotFoundError extends DevhuntError {
  constructor(message: string, details?: unknown) {
    super("not_found", message, details);
    this.name = "GitHubNotFoundError";
  }
}

export class CliError extends DevhuntError {
  constructor(message: string, details?: unknown) {
    super("cli", message, details);
    this.name = "CliError";
  }
}

export class AnalysisError extends DevhuntError {
  constructor(message: string, details?: unknown) {
    super("analysis", message, details);
    this.name = "AnalysisError";
  }
}

