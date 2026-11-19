import type { LayoutGraph, LayoutResult } from "./types.js";

/** Rank return arrows forward without changing their meaning in the source. */
export function reverseFreeEdges(
  graph: LayoutGraph,
  free: ReadonlySet<string>,
): LayoutGraph {
  return {
    ...graph,
    edges: [...graph.edges]
      .sort((a, b) => Number(free.has(a.id)) - Number(free.has(b.id)))
      .map((edge) =>
        free.has(edge.id) ? { ...edge, from: edge.to, to: edge.from } : edge,
      ),
  };
}

/** Restore arrow direction after the engine has routed the reversed graph. */
export function restoreFreeEdges(
  graph: LayoutGraph,
  result: LayoutResult,
  free: ReadonlySet<string>,
): LayoutResult {
  for (const edge of graph.edges)
    if (free.has(edge.id) && edge.from !== edge.to)
      result.edges[edge.id].points.reverse();
  return result;
}
