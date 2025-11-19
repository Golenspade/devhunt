#!/usr/bin/env bun

import { scanUser } from "../src/scan";
import { parseArgs } from "../src/cli";
import { AnalysisError, DevhuntError } from "../src/errors";
import { resolveSince } from "../src/timeWindow";

function printUsage() {
  console.log(`Usage:
  bun devhunt scan <login> --token $GITHUB_TOKEN [--window quarter|half|year|3y|all] [--yes|-y]
  bun devhunt report <login> [--tz Asia/Shanghai]

Options:
  --yes, -y    跳过用户确认，直接开始扫描（适用于批量扫描或 CI 环境）
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
      const since = resolveSince(options.window);
      await scanUser({
        login,
        token: options.token ?? process.env.GITHUB_TOKEN ?? undefined,
        since,
        skipConfirmation: options.yes ?? false,
      });
      break;
    }
    case "report": {
      try {
        const { reportUser } = await import("../src/export");
        await reportUser({ login, tzOverride: options.tz ?? null });
      } catch (err) {
        if (err instanceof DevhuntError) {
          throw err;
        }
        throw new AnalysisError(`Failed to generate report: ${(err as Error).message}`, err);
      }
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
  if (err instanceof DevhuntError) {
    switch (err.kind) {
      case "network": {
        console.error("[devhunt] 网络错误：无法访问 GitHub API。");
        console.error(`  ${err.message}`);
        console.error(
          "[devhunt] 请检查本机网络 / 代理设置，确认可以访问 https://api.github.com。"
        );
        break;
      }
      case "auth": {
        console.error("[devhunt] GitHub Token 授权错误。");
        console.error(`  ${err.message}`);
        console.error(
          "[devhunt] 请检查 GITHUB_TOKEN/GH_TOKEN 是否配置、是否过期、scope 是否足够（至少访问公开数据）。"
        );
        break;
      }
      case "not_found": {
        console.error("[devhunt] 目标用户不可达。");
        console.error(`  ${err.message}`);
        console.error("[devhunt] 请检查 login 是否拼写正确、用户是否存在且为公开账号。");
        break;
      }
      case "analysis": {
        console.error("[devhunt] 报告分析过程中出错。");
        console.error(`  ${err.message}`);
        console.error(
          "[devhunt] 这通常是本地依赖（如 vega / vega-lite）或代码 bug 导致，可以先重装依赖再试。"
        );
        break;
      }
      case "cli": {
        console.error("[devhunt] 本地 GitHub CLI (gh) 环境异常。");
        console.error(`  ${err.message}`);
        break;
      }
      default: {
        console.error("[devhunt] 未知错误：");
        console.error(err);
        break;
      }
    }
  } else {
    console.error("[devhunt] Unexpected error:", err);
  }

  process.exit(1);
});

