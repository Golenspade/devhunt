import { writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { compile } from "vega-lite";
import * as vega from "vega";

export interface LanguagesDatum {
  lang: string;
  weight: number;
}

export async function renderLanguagesChart(
  outDir: string,
  data: LanguagesDatum[]
): Promise<string> {
  await mkdir(outDir, { recursive: true });
  const spec = {
    $schema: "https://vega.github.io/schema/vega-lite/v5.json",
    data: { values: data },
    mark: "bar",
    encoding: {
      x: { field: "lang", type: "nominal", sort: "-y" },
      y: { field: "weight", type: "quantitative" }
    }
  } as const;

  const svg = await renderVegaLite(spec);
  const outPath = join(outDir, "languages.svg");
  await writeFile(outPath, svg, "utf8");
  return outPath;
}

export async function renderHoursChart(outDir: string, hours: number[]): Promise<string> {
  await mkdir(outDir, { recursive: true });
  const values = hours.map((count, hour) => ({ hour, count }));

  const spec = {
    $schema: "https://vega.github.io/schema/vega-lite/v5.json",
    data: { values },
    mark: "bar",
    encoding: {
      x: { field: "hour", type: "ordinal", axis: { title: "Hour" } },
      y: { field: "count", type: "quantitative", axis: { title: "PR count" } }
    }
  } as const;

  const svg = await renderVegaLite(spec);
  const outPath = join(outDir, "hours.svg");
  await writeFile(outPath, svg, "utf8");
  return outPath;
}

async function renderVegaLite(spec: unknown): Promise<string> {
  const compiled = compile(spec as any).spec;
  const runtime = vega.parse(compiled);
  const view = new vega.View(runtime, { renderer: "none" });
  const svg = await view.toSVG();
  return svg;
}

