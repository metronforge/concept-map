import type { LayoutGraph, LayoutPoint, LayoutResult } from "../types.js";
import { besideRoute } from "../geometry.js";
import { channelInput } from "./channel-input.js";
import { routeChannel } from "./channel.js";

/** Propose routes for the supplied arrows; callers independently inspect them. */
export function routeLayout(
  graph: LayoutGraph,
  original: LayoutResult,
  nodes: LayoutResult["nodes"],
  viewBox: LayoutPoint,
  sides?: Parameters<typeof channelInput>[3],
): LayoutResult | null {
  const input = channelInput(graph, original, nodes, sides);
  if (!input) return null;
  const routes = routeChannel({ ...input, viewBox });
  if (routes.some((route) => !route.points)) return null;
  const edges = { ...original.edges };
  for (const edge of graph.edges) {
    const points = routes.find((route) => route.id === edge.id)!
      .points as LayoutPoint[];
    edges[edge.id] = {
      points,
      ...(edge.label
        ? { label: besideRoute(points, edge.label.width, edge.label.height) }
        : {}),
    };
  }
  return { ...original, nodes, edges };
}
