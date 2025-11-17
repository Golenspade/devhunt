export interface CLIOptions {
  token?: string;
  tz?: string;
}

export function parseArgs(
  argv: string[]
): { cmd?: string; login?: string; options: CLIOptions } {
  const [cmd, login, ...rest] = argv;
  const options: CLIOptions = {};

  for (let i = 0; i < rest.length; i++) {
    const arg = rest[i];
    if (arg === "--token") {
      options.token = rest[++i];
    } else if (arg === "--tz") {
      options.tz = rest[++i];
    }
  }

  return { cmd, login, options };
}

