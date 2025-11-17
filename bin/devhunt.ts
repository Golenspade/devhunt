#!/usr/bin/env bun

import { scanUser } from "../src/scan";
import { parseArgs } from "../src/cli";

function printUsage() {
  console.log(`Usage:
  bun devhunt scan <login> --token $GITHUB_TOKEN
  bun devhunt report <login> [--tz Asia/Shanghai]
`);
}

async function main() {
  const { cmd, login, options } = parseArgs(process.argv.slice(2));

  if (!cmd || !login) {
    printUsage();
    process.exit(1);
  }

  switch (cmd) {
    case "scan": {
      await scanUser({ login, token: options.token ?? process.env.GITHUB_TOKEN ?? undefined });
      break;
    }
    case "report": {
      const { reportUser } = await import("../src/export");
      await reportUser({ login, tzOverride: options.tz ?? null });
      break;
    }
    default: {
      console.error("Unknown command:", cmd);
      printUsage();
      process.exit(1);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

