/**
 * 图表生成模块
 *
 * 使用 Vega-Lite 生成开发者画像的可视化图表。
 *
 * 设计理念：
 * - 使用 Vega-Lite 声明式语法，简洁且易于维护
 * - 在 Node 端直接渲染为 SVG，无需浏览器环境
 * - 输出 SVG 格式，便于嵌入 HTML 或直接查看
 *
 * 参考文档：
 * - mvp.md 中的技术栈选择（Vega-Lite 用于 Node 端导出 SVG）
 * - mvp.md 中的输出形态（languages.svg / hours.svg）
 */

import { writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { compile } from "vega-lite";
import * as vega from "vega";

/**
 * 语言权重数据点
 *
 * 用于语言分布图的数据格式。
 */
export interface LanguagesDatum {
  /** 编程语言名称（如 "TypeScript", "Go"） */
  lang: string;
  /** 语言权重（0-1 之间的归一化值） */
  weight: number;
}

/**
 * 渲染语言分布图
 *
 * 生成一个条形图，展示开发者的编程语言技能分布。
 *
 * 图表特点：
 * - X 轴：编程语言名称（按权重降序排列）
 * - Y 轴：语言权重（归一化后的值）
 * - 条形图：直观展示各语言的相对重要性
 *
 * @param outDir - 输出目录路径
 * @param data - 语言权重数据数组（已按权重降序排列）
 * @returns 生成的 SVG 文件路径
 *
 * @example
 * ```typescript
 * const data = [
 *   { lang: "TypeScript", weight: 0.62 },
 *   { lang: "Go", weight: 0.21 },
 *   { lang: "Python", weight: 0.17 }
 * ];
 * const path = await renderLanguagesChart("out/alice/charts", data);
 * // => "out/alice/charts/languages.svg"
 * ```
 *
 * 技术细节：
 * - 使用 Vega-Lite 的 "bar" mark 类型
 * - X 轴使用 "nominal" 类型（分类数据）
 * - Y 轴使用 "quantitative" 类型（数值数据）
 * - sort: "-y" 表示按 Y 轴值降序排列
 */
export async function renderLanguagesChart(
  outDir: string,
  data: LanguagesDatum[]
): Promise<string> {
  await mkdir(outDir, { recursive: true });

  // Vega-Lite 规范：语言分布条形图
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

/**
 * 渲染活跃时段分布图
 *
 * 生成一个 24 小时直方图，展示开发者的活跃时段分布。
 *
 * 图表特点：
 * - X 轴：小时数（0-23）
 * - Y 轴：PR 创建数量
 * - 条形图：展示每个小时的活跃程度
 *
 * @param outDir - 输出目录路径
 * @param hours - 24 小时的 PR 计数数组（索引 0-23 对应 0:00-23:00）
 * @returns 生成的 SVG 文件路径
 *
 * @example
 * ```typescript
 * const hours = [2, 1, 0, 0, 0, 0, 3, 5, 8, 12, 15, 18, 20, 22, 25, 28, 30, 25, 20, 15, 10, 8, 5, 3];
 * const path = await renderHoursChart("out/alice/charts", hours);
 * // => "out/alice/charts/hours.svg"
 * ```
 *
 * 设计理念：
 * - 用于识别开发者的"核心工作时段"（参考 mvp.md 中的 core_hours 指标）
 * - 辅助判断作息习惯和时区（如"当地时间 15:00-01:00 连续活跃"）
 * - 可用于团队协作时间匹配分析（参考 pod.md 中的"作息/匹配"镜头）
 *
 * 技术细节：
 * - 使用 "ordinal" 类型表示小时（保持顺序但不做数值运算）
 * - 数据来源：PR.createdAt 的小时数统计（参考 analyze.ts）
 */
export async function renderHoursChart(outDir: string, hours: number[]): Promise<string> {
  await mkdir(outDir, { recursive: true });

  // 将数组转换为 Vega-Lite 数据格式
  const values = hours.map((count, hour) => ({ hour, count }));

  // Vega-Lite 规范：活跃时段直方图
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

/**
 * 渲染 Vega-Lite 规范为 SVG
 *
 * 内部辅助函数，将 Vega-Lite 规范编译为 Vega 规范，
 * 然后使用 Vega 运行时渲染为 SVG 字符串。
 *
 * @param spec - Vega-Lite 规范对象
 * @returns SVG 字符串
 *
 * 技术细节：
 * - compile(): 将 Vega-Lite 高级语法编译为 Vega 低级语法
 * - vega.parse(): 解析 Vega 规范为运行时对象
 * - View: 创建视图实例（renderer: "none" 表示无 DOM 渲染）
 * - toSVG(): 异步生成 SVG 字符串
 */
async function renderVegaLite(spec: unknown): Promise<string> {
  const compiled = compile(spec as any).spec;
  const runtime = vega.parse(compiled);
  const view = new vega.View(runtime, { renderer: "none" });
  const svg = await view.toSVG();
  return svg;
}

