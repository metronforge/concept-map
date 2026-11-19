import type { SourceMap } from "../schema.js";
import type { LabelMeasurer, LayoutGraph } from "./types.js";
import type { LayoutProblem } from "./problem.js";
import { layoutGraph } from "./graph.js";
import { deriveIntent } from "./intent.js";

export function buildProblem(
  map: SourceMap,
  measure: LabelMeasurer,
  intent = true,
): LayoutProblem {
  const graph = layoutGraph(map, measure);
  const direction = map.direction ?? "down";
  return {
    nodes: graph.nodes,
    edges: graph.edges,
    groups: graph.lanes,
    constraints: [
      { kind: "direction", strength: "preferred", direction },
      ...(graph.lanes.length
        ? [
            {
              kind: "lanes" as const,
              strength: "required" as const,
              direction,
              lanes: graph.lanes.map((l) => l.id),
            },
          ]
        : []),
      ...(intent ? deriveIntent(map) : []),
    ],
  };
}
/** Bridge to the established graph contract without changing its measurements. */
export function problemGraph(problem: LayoutProblem): LayoutGraph {
  const direction = problem.constraints.find((c) => c.kind === "direction");
  return {
    direction: direction?.direction ?? "down",
    nodes: problem.nodes,
    edges: problem.edges,
    lanes: problem.groups,
  };
}

/** Copy nodes into preferred scenario order; unlisted nodes retain their order. */
export function orderedGraph(problem: LayoutProblem): LayoutGraph {
  const graph = problemGraph(problem);
  const order = problem.constraints.find((c) => c.kind === "order");
  if (order) {
    const rank = new Map(order.nodes.map((id, i) => [id, i]));
    graph.nodes = [...graph.nodes].sort(
      (a, b) =>
        (rank.get(a.id) ?? order.nodes.length) -
        (rank.get(b.id) ?? order.nodes.length),
    );
  }
  return graph;
}
