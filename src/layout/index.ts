import type { ResolvedMap, SourceMap } from "../schema.js";
import { validateReferences } from "../schema/references.js";
import { parseMap, checkedResult } from "./check.js";
import { measureLabel } from "./measure.js";
import { layoutGraph } from "./graph.js";
import { resolveGeometry } from "./resolve.js";
import type { LayoutEngine, LayoutOptions } from "./types.js";
import type { LayoutReport } from "./stages/report.js";
export type * from "./types.js";
export { measureLabel } from "./measure.js";
export { validateReferences } from "../schema/references.js";
export { check, describeDefects } from "./stages/report.js";
export type {
  Band,
  CheckOptions,
  Contact,
  LayoutReport,
} from "./stages/report.js";

/** Thrown by `layout` with `strict` when the drawing has hard defects. */
export interface LayoutDefectsError extends Error {
  name: "LayoutDefectsError";
  /** Every finding, not only the hard ones. */
  report: LayoutReport;
}
/** True for the error `layout` throws with `strict`. */
export const isLayoutDefectsError = (e: unknown): e is LayoutDefectsError =>
  e instanceof Error && e.name === "LayoutDefectsError" && "report" in e;

/** Validate first, then measure and lay out; complete hand geometry is retained.
 * `layout` proposes a drawing; `check` judges it. Success here does not mean
 * the drawing was checked unless `strict` is set. */
export async function layout(
  input: unknown,
  engine: LayoutEngine,
  options: LayoutOptions = {},
): Promise<ResolvedMap> {
  const map = parseMap(input);
  validateReferences(map);
  const measure = options.measureLabel ?? measureLabel;
  if ("viewBox" in map) return strict(map, map, measure, options);
  const graph = layoutGraph(map, measure);
  const result = checkedResult(
    await engine.layout(JSON.parse(JSON.stringify(graph)) as typeof graph),
    graph,
  );
  const resolved = resolveGeometry(map, graph, result, measure);
  validateReferences(resolved);
  return strict(map, resolved, measure, options);
}

/** The check is loaded only for `strict`, so plain layout stays small. */
async function strict(
  source: SourceMap | ResolvedMap,
  resolved: ResolvedMap,
  measure: NonNullable<LayoutOptions["measureLabel"]>,
  options: LayoutOptions,
): Promise<ResolvedMap> {
  if (!options.strict) return resolved;
  const { check, describeDefects } = await import("./stages/report.js");
  const report = check(source, resolved, { measureLabel: measure });
  if (!report.hard) return resolved;
  throw Object.assign(
    new Error(
      `The layout has hard defects:\n${describeDefects(report).join("\n")}`,
    ),
    { name: "LayoutDefectsError" as const, report },
  );
}
