import type { LayoutGraph, LayoutPoint, LayoutResult } from "../types.js";
import { routeLayout } from "./channel-layout.js";

/** Propose channel routes only for arrows whose endpoints moved. */
export function routeMoved(
  graph: LayoutGraph,
  original: LayoutResult,
  nodes: LayoutResult["nodes"],
  viewBox: LayoutPoint,
): LayoutResult | null {
  const moved = (id: string) =>
    nodes[id].some(
      (coordinate, axis) => coordinate !== original.nodes[id][axis],
    );
  const edges = graph.edges.filter(
    (edge) => moved(edge.from) || moved(edge.to),
  );
  return edges.length
    ? routeLayout({ ...graph, edges }, original, nodes, viewBox)
    : { ...original, nodes };
}
