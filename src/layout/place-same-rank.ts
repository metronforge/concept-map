import type { SourceMap } from "../schema.js";
import type { LayoutProblem } from "./problem.js";
import type { Placer, Measurer } from "./ports.js";
import type { PlacementOutcome } from "./outcomes.js";
import { place } from "./place.js";
import { problemGraph } from "./build-problem.js";
import { alignSameRank } from "./same-rank.js";
import { acceptSameRank } from "./same-rank-boundary.js";
import { createRouteInspector } from "./inspect-routes.js";
import type { RouteRefinement } from "./inspect-routes.js";

/** Same-rank is a pipeline capability, not an engine rank option. Keep the
 * solver, inspection and error conversion behind this on-demand entry.
 */
export async function placeSameRank(
  source: SourceMap,
  problem: LayoutProblem,
  placer: Placer,
  measurer: Measurer,
  refinement?: RouteRefinement,
): Promise<PlacementOutcome> {
  const outcome = await place(
    {
      ...problem,
      constraints: problem.constraints.filter((c) => c.kind !== "sameRank"),
    },
    placer,
  );
  if (outcome.kind !== "placed") return outcome;
  const graph = problemGraph(problem);
  const aligned = acceptSameRank(
    alignSameRank(
      problem,
      graph,
      outcome.result,
      64,
      32,
      createRouteInspector(source, graph, outcome.result, measurer, refinement),
    ),
  );
  return { ...outcome, result: aligned.result, dropped: aligned.unsupported };
}
