import type { SourceMap } from "../schema.js";
import type { LayoutProblem, Constraint } from "./problem.js";
import type { Measurer, Placer } from "./ports.js";
import type { PlacementOutcome } from "./outcomes.js";
import type { LayoutGraph, LayoutResult } from "./types.js";
import { ResultRejectedError } from "./errors.js";
import { place } from "./place.js";
import { problemGraph } from "./build-problem.js";
import { freeEdges } from "./route/free-edges.js";
import { excludeRankEdges } from "./route/exclude-rank-edges.js";
import { routeFree } from "./route/channel-free.js";
import { createRouteInspector } from "./inspect-routes.js";
import type { RouteRefinement } from "./inspect-routes.js";

const statedFree = (c: Constraint) =>
  c.kind === "free" && c.origin === "stated";

function withoutExcluded(
  problem: LayoutProblem,
  ids: ReadonlySet<string>,
): LayoutProblem {
  return {
    ...problem,
    edges: excludeRankEdges(problemGraph(problem), ids).edges,
    constraints: problem.constraints.filter(
      (c) =>
        !statedFree(c) &&
        !("edge" in c && ids.has(c.edge)) &&
        !(c.kind === "mainPath" && c.edges.some((id) => ids.has(id))),
    ),
  };
}

function rejectedFree(
  baseline: Extract<PlacementOutcome, { kind: "placed" }>,
  problem: LayoutProblem,
  placer: Placer,
  conflicts: readonly string[],
): PlacementOutcome {
  const hints = problem.constraints.filter(statedFree);
  const required = hints.find((hint) => hint.strength === "required");
  if (required)
    throw new ResultRejectedError({
      placer: placer.name,
      constraint: "free",
      message: `${required.path}: free routing failed for ${conflicts.join(", ")}`,
    });
  return {
    ...baseline,
    dropped: hints.flatMap((hint) =>
      hint.kind === "free" && hint.path
        ? [
            {
              ...hint,
              origin: "stated" as const,
              path: hint.path,
              reason: "unsupported" as const,
              conflicts,
            },
          ]
        : [],
    ),
  };
}

async function routedCandidate(
  problem: LayoutProblem,
  placer: Placer,
  free: LayoutGraph,
  ids: ReadonlySet<string>,
): Promise<LayoutResult | null> {
  const candidate = await place(withoutExcluded(problem, ids), placer);
  if (candidate.kind !== "placed") return null;
  const boxes = Object.values(candidate.result.nodes);
  const viewBox: [number, number] = [
    Math.max(...boxes.map((b) => b[0] + b[2])) + 20,
    Math.max(...boxes.map((b) => b[1] + b[3])) + 20,
  ];
  return routeFree(free, candidate.result, viewBox, problem.constraints);
}

/** Compare an excluded-edge placement to the complete engine drawing. */
export async function placeFree(
  source: SourceMap,
  problem: LayoutProblem,
  placer: Placer,
  measurer: Measurer,
  refinement?: RouteRefinement,
): Promise<PlacementOutcome> {
  const baseline = await place(
    {
      ...problem,
      constraints: problem.constraints.filter((c) => !statedFree(c)),
    },
    placer,
  );
  if (baseline.kind !== "placed") return baseline;
  const graph = problemGraph(problem);
  const free = freeEdges(graph, problem.constraints);
  const ids = new Set(free.edges.map((edge) => edge.id));
  const routed = await routedCandidate(problem, placer, free, ids);
  if (!routed) return rejectedFree(baseline, problem, placer, [...ids]);
  const conflicts = createRouteInspector(
    source,
    graph,
    baseline.result,
    measurer,
    refinement,
  )(routed);
  return conflicts.length
    ? rejectedFree(baseline, problem, placer, conflicts)
    : { ...baseline, result: routed, dropped: [] };
}
