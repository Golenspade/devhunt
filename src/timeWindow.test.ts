import { describe, it, expect } from "bun:test";
import { resolveSince } from "./timeWindow";

function toIsoDate(date: string): string {
  return new Date(date).toISOString();
}

describe("resolveSince", () => {
  const now = new Date("2024-01-01T00:00:00Z");

  it("defaults to 1 year when window is undefined", () => {
    const result = resolveSince(undefined, now);
    expect(result).toBe(toIsoDate("2023-01-01T00:00:00Z"));
  });

  it("handles 'year' window", () => {
    const result = resolveSince("year", now);
    expect(result).toBe(toIsoDate("2023-01-01T00:00:00Z"));
  });

  it("handles 'quarter' window", () => {
    const result = resolveSince("quarter", now);
    expect(result).toBe(toIsoDate("2023-10-03T00:00:00Z"));
  });

  it("handles 'half' window", () => {
    const result = resolveSince("half", now);
    expect(result).toBe(toIsoDate("2023-07-03T00:00:00Z"));
  });

  it("handles '3y' window", () => {
    const result = resolveSince("3y", now);
    expect(result).toBe(toIsoDate("2021-01-01T00:00:00Z"));
  });

  it("returns null for 'all' window", () => {
    const result = resolveSince("all", now);
    expect(result).toBeNull();
  });
});

