import type { SourceMap, ResolvedMap } from "../schema.js";

/** Keep engine imports behind source-map resolution, never registration or hydration. */
export async function layoutWithEngine(
  source: SourceMap,
  name: string,
): Promise<ResolvedMap> {
  if (name !== "dagre" && name !== "elk")
    throw new Error(`Unknown layout "${name}"; expected "dagre" or "elk"`);
  const { layout } = await import("../layout/index.js");
  // Separate branches also keep bundler-generated preload lists independent.
  if (name === "dagre") {
    const { dagreEngine } = await import("../layout/dagre.js");
    return layout(source, dagreEngine);
  }
  const { elkEngine } = await import("../layout/elk.js");
  return layout(source, elkEngine);
}
