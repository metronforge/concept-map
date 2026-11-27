import type { LayoutGraph } from "../types.js";

/** Omit arrows that must not affect engine rank placement. */
export function excludeRankEdges(
  graph: LayoutGraph,
  excluded: ReadonlySet<string>,
): LayoutGraph {
  return {
    ...graph,
    edges: graph.edges.filter((edge) => !excluded.has(edge.id)),
  };
}
