import type { ResolvedMap } from "../schema.js";
import { validateReferences } from "../schema/references.js";
import { parseMap, checkedResult } from "./check.js";
import { measureLabel } from "./measure.js";
import { layoutGraph } from "./graph.js";
import { resolveGeometry } from "./resolve.js";
import type { LayoutEngine, LayoutOptions } from "./types.js";
export type * from "./types.js";
export { measureLabel } from "./measure.js";
export { validateReferences } from "../schema/references.js";
/** Validate first, then measure and lay out; complete hand geometry is retained. */
export async function layout(
  input: unknown,
  engine: LayoutEngine,
  options: LayoutOptions = {},
): Promise<ResolvedMap> {
  const map = parseMap(input);
  validateReferences(map);
  if ("viewBox" in map) return map;
  const measure = options.measureLabel ?? measureLabel;
  const graph = layoutGraph(map, measure);
  const result = checkedResult(
    await engine.layout(JSON.parse(JSON.stringify(graph)) as typeof graph),
    graph,
  );
  const resolved = resolveGeometry(map, graph, result, measure);
  validateReferences(resolved);
  return resolved;
}
