import type { Constraint } from "../problem.js";
import type { LayoutGraph } from "../types.js";

/** Select only literal free hints; derived return-edge intent keeps engine behavior. */
export function freeEdges(
  graph: LayoutGraph,
  constraints: readonly Constraint[],
) {
  const ids = new Set(
    constraints.flatMap((constraint) =>
      constraint.kind === "free" && constraint.origin === "stated"
        ? [constraint.edge]
        : [],
    ),
  );
  return { ...graph, edges: graph.edges.filter((edge) => ids.has(edge.id)) };
}
