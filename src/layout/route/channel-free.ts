import type { Constraint } from "../problem.js";
import type { LayoutGraph, LayoutPoint, LayoutResult } from "../types.js";
import { routeLayout } from "./channel-layout.js";
import { channelSides } from "./channel-sides.js";

/** Route omitted arrows using their placed boxes and stated side hints. */
export function routeFree(
  graph: LayoutGraph,
  original: LayoutResult,
  viewBox: LayoutPoint,
  constraints: readonly Constraint[],
): LayoutResult | null {
  const sides: Record<string, ReturnType<typeof channelSides>> = {};
  for (const edge of graph.edges) {
    const from = original.nodes[edge.from],
      to = original.nodes[edge.to];
    if (!from || !to) return null;
    sides[edge.id] = channelSides(from, to, edge.id, constraints);
  }
  return routeLayout(graph, original, original.nodes, viewBox, sides);
}
