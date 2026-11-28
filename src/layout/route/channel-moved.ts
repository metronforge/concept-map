import type { LayoutGraph, LayoutPoint, LayoutResult } from "../types.js";
import { routeLayout } from "./channel-layout.js";

/** Propose channel routes only for arrows whose endpoints moved. */
export function routeMoved(
  graph: LayoutGraph,
  original: LayoutResult,
  nodes: LayoutResult["nodes"],
  viewBox: LayoutPoint,
  pins: ReadonlySet<string> = new Set(),
): LayoutResult | null {
  const moved = (id: string) =>
    nodes[id].some(
      (coordinate, axis) => coordinate !== original.nodes[id][axis],
    );
  const edges = graph.edges.filter(
    (edge) => moved(edge.from) || moved(edge.to),
  );
  const sides = Object.fromEntries(
    edges.flatMap((edge) => {
      if (!pins.has(edge.from) || !pins.has(edge.to)) return [];
      const from = nodes[edge.from],
        to = nodes[edge.to];
      return [[edge.id, pinnedSides(from, to)]];
    }),
  ) as NonNullable<Parameters<typeof routeLayout>[4]>;
  return edges.length
    ? routeLayout({ ...graph, edges }, original, nodes, viewBox, sides)
    : { ...original, nodes };
}

function pinnedSides(
  from: LayoutResult["nodes"][string],
  to: LayoutResult["nodes"][string],
) {
  const dx = to[0] + to[2] / 2 - from[0] - from[2] / 2;
  const dy = to[1] + to[3] / 2 - from[1] - from[3] / 2;
  if (Math.abs(dx) >= Math.abs(dy)) {
    if (
      Math.abs(dx) < (from[2] + to[2]) / 2 &&
      Math.abs(dy) < (from[3] + to[3]) / 2
    )
      return { from: "bottom", to: "bottom" };
    return dx >= 0
      ? { from: "right", to: "left" }
      : { from: "left", to: "right" };
  }
  return dy >= 0
    ? { from: "bottom", to: "top" }
    : { from: "top", to: "bottom" };
}
