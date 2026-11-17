import type { ResolvedMap, SourceMap } from "../schema.js";
import { validateReferences } from "../schema/references.js";
import { parseMap } from "./check.js";
import { asMeasurer } from "./measure.js";
import { buildProblem, problemGraph } from "./build-problem.js";
import { asPlacer } from "./legacy.js";
import { place } from "./place.js";
import { checkConstraints } from "./stages/constraints.js";
import { resolveGeometry } from "./resolve.js";
import type { LayoutEngine, LayoutOptions } from "./types.js";
import {
  EngineFailedError,
  ResultRejectedError,
  UnsupportedConstraintsError,
  LayoutDefectsError,
} from "./errors.js";
import { placeAnnotations } from "./stages/placement.js";
export * from "./errors.js";
export type { Measurer } from "./ports.js";
export { refine } from "./stages/refine.js";
export type { ConstraintVerdict } from "./problem.js";
export type * from "./types.js";
export { measureLabel, fontTableMeasurer } from "./measure.js";
export { validateReferences } from "../schema/references.js";
export { check, describeDefects } from "./stages/report.js";
export type {
  Band,
  CheckOptions,
  Contact,
  LayoutReport,
} from "./stages/report.js";

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
  const measurer = asMeasurer(options.measureLabel);
  const measure = measurer.measure.bind(measurer);
  if ("viewBox" in map) return strict(map, map, measure, options);
  const problem = buildProblem(map, measure);
  const graph = problemGraph(problem);
  const placer = asPlacer(engine);
  const outcome = await place(problem, placer);
  if (outcome.kind === "engine-failed") throw new EngineFailedError(outcome);
  if (outcome.kind === "unsupported-constraints")
    throw new UnsupportedConstraintsError(outcome);
  const resolved = resolveGeometry(map, graph, outcome.result, measure);
  resolved.measurement = {
    name: measurer.name,
    labels: Object.fromEntries(
      graph.edges.flatMap((e) => {
        if (!e.label) return [];
        const { text, ...size } = e.label;
        return [[e.id, size]];
      }),
    ),
  };
  const rejected = checkConstraints(map, resolved).find((c) => !c.holds);
  if (rejected)
    throw new ResultRejectedError({
      placer: placer.name,
      constraint: rejected.kind,
      message: rejected.message,
    });
  validateReferences(resolved);
  return strict(map, placeAnnotations(resolved), measure, options);
}

/** The check is loaded only for `strict`, so plain layout stays small. */
async function strict(
  source: SourceMap | ResolvedMap,
  resolved: ResolvedMap,
  measure: import("./types.js").LabelMeasurer,
  options: LayoutOptions,
): Promise<ResolvedMap> {
  if (!options.strict) return resolved;
  const { check, describeDefects } = await import("./stages/report.js");
  const report = check(source, resolved, { measureLabel: measure });
  if (!report.hard) return resolved;
  throw new LayoutDefectsError(
    report,
    `The layout has hard defects:\n${describeDefects(report).join("\n")}`,
  );
}
