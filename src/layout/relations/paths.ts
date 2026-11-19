import type { RelationEdge, RelationGraph } from "./types.js";

/** Longest-path Bellman–Ford in exact ticks. V sweeps expose positive cycles. */
export function longestPaths(graph: RelationGraph, initial: number[]) {
  const distances = [...initial];
  const predecessors: (RelationEdge | undefined)[] = Array(initial.length);
  let changed: number | undefined;
  for (let pass = 0; pass < initial.length; pass++) {
    changed = undefined;
    for (const edge of graph.edges) {
      const candidate = distances[edge.from] + edge.weight;
      if (candidate <= distances[edge.to]) continue;
      distances[edge.to] = candidate;
      predecessors[edge.to] = edge;
      changed = edge.to;
    }
    if (changed === undefined) break;
  }
  return { distances, predecessors, changed };
}

/** A vertex changed on sweep V has a positive cycle in its predecessor walk. */
export function positiveCycle(
  predecessors: (RelationEdge | undefined)[],
  changed: number,
): RelationEdge[] {
  let vertex = changed;
  for (let i = 0; i < predecessors.length; i++) {
    vertex = predecessors[vertex]!.from;
  }
  const start = vertex;
  const cycle: RelationEdge[] = [];
  do {
    const edge = predecessors[vertex]!;
    cycle.push(edge);
    vertex = edge.from;
  } while (vertex !== start);
  return cycle.reverse();
}
