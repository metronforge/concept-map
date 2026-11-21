import type { ResolvedMap, SourceMap } from "../schema.js";
import { validateReferences } from "../schema/references.js";
import { parseMap } from "./check.js";
import { asMeasurer } from "./measure.js";
import type { Measurer } from "./ports.js";
import { atWidth } from "./width.js";
import { refine } from "./stages/refine.js";
import { buildProblem, problemGraph } from "./build-problem.js";
import { reportUnsupportedHints } from "./hints.js";
import { asPlacer } from "./legacy.js";
import { place } from "./place.js";
import { checkConstraints } from "./stages/constraints.js";
import { resolveMeasured } from "./resolve-measured.js";
import type { LayoutEngine, LayoutOptions } from "./types.js";
import {
  EngineFailedError,
  ResultRejectedError,
  UnsupportedConstraintsError,
  LayoutDefectsError,
} from "./errors.js";
import { placeAnnotations } from "./stages/placement.js";
export {
  LayoutError,
  EngineFailedError,
  ResultRejectedError,
  UnsupportedConstraintsError,
  LayoutDefectsError,
  isLayoutError,
  isEngineFailedError,
  isResultRejectedError,
  isUnsupportedConstraintsError,
  isLayoutDefectsError,
} from "./errors.js";
export type { Measurer } from "./ports.js";
export { labelsInPanel } from "./stages/presentation.js";
export { refine } from "./stages/refine.js";
export type { ConstraintVerdict, Strength } from "./problem.js";
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
  if (
    options.widthEm !== undefined &&
    (!Number.isFinite(options.widthEm) || options.widthEm <= 0)
  )
    throw new Error("widthEm must be a finite positive number");
  const measurer = asMeasurer(options.measureLabel);
  if ("viewBox" in map)
    return strict(
      map,
      map,
      atWidth(measurer, map, options.widthEm).measure,
      options,
    );
  let resolved = await resolveSource(map, engine, measurer, options);
  if (
    options.widthEm !== undefined &&
    resolved.viewBox[0] / options.widthEm > 10.5
  ) {
    resolved = await resolveSource(
      map,
      engine,
      atWidth(measurer, resolved, options.widthEm),
      { ...options, onUnsupportedHints: undefined },
    );
    resolved = refine(resolved, atWidth(measurer, resolved, options.widthEm));
  }
  return strict(
    map,
    resolved,
    atWidth(measurer, resolved, options.widthEm).measure,
    options,
  );
}

async function resolveSource(
  map: SourceMap,
  engine: LayoutEngine,
  measurer: Measurer,
  options: LayoutOptions,
): Promise<ResolvedMap> {
  const measure = measurer.measure.bind(measurer);
  const problem = buildProblem(map, measure, options.intent);
  const graph = problemGraph(problem);
  const placer = asPlacer(engine);
  const outcome = await place(problem, placer);
  if (outcome.kind === "engine-failed") throw new EngineFailedError(outcome);
  if (outcome.kind === "unsupported-constraints")
    throw new UnsupportedConstraintsError(outcome);
  reportUnsupportedHints(outcome.unsupported, options.onUnsupportedHints);
  const resolved = resolveMeasured(map, graph, outcome.result, measurer);
  const rejected = checkConstraints(map, resolved).find(
    (c) => c.strength === "required" && c.holds === false,
  );
  if (rejected)
    throw new ResultRejectedError({
      placer: placer.name,
      constraint: rejected.kind,
      message: rejected.message,
    });
  validateReferences(resolved);
  return placeAnnotations(resolved);
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
