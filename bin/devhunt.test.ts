import { describe, it, expect } from "bun:test";
import { parseArgs } from "../src/cli";
import type { CLIOptions } from "../src/cli";

describe("CLI argument parsing", () => {
  it("parses scan command with token", () => {
    const argv = ["scan", "octocat", "--token", "ABC123"];
    const { cmd, login, options } = parseArgs(argv);

    expect(cmd).toBe("scan");
    expect(login).toBe("octocat");
    expect((options as CLIOptions).token).toBe("ABC123");
  });

  it("parses report command with timezone", () => {
    const argv = ["report", "alice", "--tz", "Asia/Shanghai"];
    const { cmd, login, options } = parseArgs(argv);

    expect(cmd).toBe("report");
    expect(login).toBe("alice");
    expect((options as CLIOptions).tz).toBe("Asia/Shanghai");
  });

  it.each(["UTC", "gMt"])("accepts timezone alias %s and preserves its spelling", (tz) => {
    const { options } = parseArgs(["report", "alice", "--tz", tz]);
    expect(options.tz).toBe(tz);
  });

  it("accepts the inclusive fixed-offset boundary and preserves it", () => {
    const { options } = parseArgs(["report", "alice", "--tz", "+14:00"]);
    expect(options.tz).toBe("+14:00");
  });

  it("accepts an IANA alias and preserves the supplied identifier", () => {
    const { options } = parseArgs(["report", "alice", "--tz", "US/Eastern"]);
    expect(options.tz).toBe("US/Eastern");
  });

  it.each(["+14:01", "Mars/Olympus"])("rejects invalid timezone %s during parsing", (tz) => {
    const parse = () => parseArgs(["report", "alice", "--tz", tz]);
    expect(parse).toThrow(tz);
    expect(parse).toThrow(/UTC.*GMT.*±HH:mm.*IANA/i);
  });

  it("parses scan command with time window", () => {
    const argv = ["scan", "bob", "--window", "year"];
    const { cmd, login, options } = parseArgs(argv);

    expect(cmd).toBe("scan");
    expect(login).toBe("bob");
    expect((options as CLIOptions).window).toBe("year");
  });

  it("parses scan command with --yes", () => {
    const argv = ["scan", "octocat", "--yes"];
    const { cmd, login, options } = parseArgs(argv);

    expect(cmd).toBe("scan");
    expect(login).toBe("octocat");
    expect((options as CLIOptions).yes).toBe(true);
  });

  it("parses scan command with -y", () => {
    const argv = ["scan", "octocat", "-y"];
    const { cmd, login, options } = parseArgs(argv);

    expect(cmd).toBe("scan");
    expect(login).toBe("octocat");
    expect((options as CLIOptions).yes).toBe(true);
  });
});
