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
import { alignSameRank } from "./same-rank.js";
import { acceptSameRank } from "./same-rank-boundary.js";

const statedFree = (c: Constraint) =>
  c.kind === "free" && c.origin === "stated";

function withoutExcluded(
  problem: LayoutProblem,
  ids: ReadonlySet<string>,
  placement = false,
): LayoutProblem {
  return {
    ...problem,
    edges: excludeRankEdges(problemGraph(problem), ids).edges,
    constraints: problem.constraints.filter(
      (c) =>
        !statedFree(c) &&
        (!placement || c.kind !== "sameRank") &&
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
): Extract<PlacementOutcome, { kind: "placed" }> {
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
  const candidate = await place(withoutExcluded(problem, ids, true), placer);
  if (candidate.kind !== "placed") return null;
  return routeOmitted(free, candidate.result, problem.constraints);
}

function routeOmitted(
  free: LayoutGraph,
  result: LayoutResult,
  constraints: readonly Constraint[],
) {
  return routeFree(free, result, routeBounds(result), constraints);
}

function routeBounds(result: LayoutResult): [number, number] {
  const boxes = Object.values(result.nodes);
  return [
    Math.max(...boxes.map((b) => b[0] + b[2])) + 20,
    Math.max(...boxes.map((b) => b[1] + b[3])) + 20,
  ];
}

function alignWithFree(
  problem: LayoutProblem,
  graph: LayoutGraph,
  free: LayoutGraph,
  ids: ReadonlySet<string>,
  chosen: Extract<PlacementOutcome, { kind: "placed" }>,
  routed: boolean,
  inspect: ReturnType<typeof createRouteInspector>,
): Extract<PlacementOutcome, { kind: "placed" }> {
  const alignment = routed
    ? withoutExcluded(problem, ids)
    : {
        ...problem,
        constraints: problem.constraints.filter((c) => !statedFree(c)),
      };
  const check = (candidate: LayoutResult) => {
    const complete = routed
      ? routeOmitted(free, candidate, problem.constraints)
      : candidate;
    return complete ? inspect(complete) : [...ids];
  };
  const aligned = acceptSameRank(
    alignSameRank(
      alignment,
      routed ? problemGraph(alignment) : graph,
      chosen.result,
      64,
      32,
      check,
    ),
  );
  const result = routed
    ? routeOmitted(free, aligned.result, problem.constraints)
    : aligned.result;
  return {
    ...chosen,
    result: result!,
    dropped: [...(chosen.dropped ?? []), ...aligned.unsupported],
  };
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
      constraints: problem.constraints.filter(
        (c) => !statedFree(c) && c.kind !== "sameRank",
      ),
    },
    placer,
  );
  if (baseline.kind !== "placed") return baseline;
  const graph = problemGraph(problem);
  const free = freeEdges(graph, problem.constraints);
  const ids = new Set(free.edges.map((edge) => edge.id));
  const routed = await routedCandidate(problem, placer, free, ids);
  const inspect = createRouteInspector(
    source,
    graph,
    baseline.result,
    measurer,
    refinement,
  );
  const conflicts = routed ? inspect(routed) : [...ids];
  const accepted = !!routed && !conflicts.length;
  const chosen = accepted
    ? { ...baseline, result: routed, dropped: [] }
    : rejectedFree(baseline, problem, placer, conflicts);
  return problem.constraints.some((c) => c.kind === "sameRank")
    ? alignWithFree(problem, graph, free, ids, chosen, accepted, inspect)
    : chosen;
}
