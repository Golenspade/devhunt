export type TimeWindowOption = "quarter" | "half" | "year" | "3y" | "all";

export function resolveSince(windowOpt?: string, now: Date = new Date()): string | null {
  const dayMs = 24 * 60 * 60 * 1000;

  const key = (windowOpt as TimeWindowOption | undefined) ?? "year";

  if (key === "all") {
    return null;
  }

  let days: number;
  switch (key) {
    case "quarter":
      days = 90;
      break;
    case "half":
      days = 182;
      break;
    case "3y":
      days = 365 * 3;
      break;
    case "year":
    default:
      days = 365;
      break;
  }

  const since = new Date(now.getTime() - days * dayMs);
  return since.toISOString();
}

