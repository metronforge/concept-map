import type { ResolvedMap, SourceMap } from "../schema.js";
import type { Measurer } from "./ports.js";
import type { LayoutGraph, LayoutResult } from "./types.js";
import type { Contact } from "./stages/quality.js";
import type { InspectRoutes } from "./same-rank-outcome.js";
import { resolveMeasured } from "./resolve-measured.js";
import { placeAnnotations } from "./stages/placement.js";
import { newRoutingDefects } from "./routing-defects.js";

/** Resolve every attempt like layout, comparing it to the engine drawing,
 * never to a previous retry. The checker remeasures labels independently.
 */
export function createRouteInspector(
  source: SourceMap,
  graph: LayoutGraph,
  original: LayoutResult,
  measurer: Measurer,
): InspectRoutes {
  const resolve = (result: LayoutResult) =>
    placeAnnotations(resolveMeasured(source, graph, result, measurer));
  const before = resolve(original);
  return (candidate) => {
    const after = resolve(candidate);
    return routingConflictEdges(
      newRoutingDefects(source, before, after, { measureLabel: measurer }),
      after,
    );
  };
}

/** A repeat's scenario and badge index distinguish multiple passes on a step.
 * Exact identities also keep colons in source arrow and step ids intact.
 */
export function routingConflictEdges(
  contacts: readonly Contact[],
  resolved: ResolvedMap,
): string[] {
  const arrows = new Map<string, string>();
  for (const id of Object.keys(resolved.edges))
    for (const kind of ["line", "label", "step"])
      arrows.set(`${kind}:${id}`, id);
  resolved.scenarios.forEach((scenario, i) => {
    scenario.repeatBadges?.forEach((badge, j) => {
      arrows.set(`repeat:${i}:${j}:${badge.step}`, badge.edge);
    });
  });
  return [
    ...new Set(
      contacts.flatMap(({ a, b }) =>
        [a, b].flatMap((id) => (arrows.has(id) ? [arrows.get(id)!] : [])),
      ),
    ),
  ];
}
