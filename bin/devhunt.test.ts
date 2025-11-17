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
});

