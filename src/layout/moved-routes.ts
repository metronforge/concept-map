import type { Constraint } from "./problem.js";
import type {
  LayoutGraph,
  LayoutResult,
  LayoutRoute,
  LayoutPoint,
} from "./types.js";
import { crossLaneRoute, besideRoute } from "./geometry.js";
import { routeSelfEdges } from "./self-route.js";
import { movedPortRoute } from "./moved-ports.js";

/** Reattach arrows after alignment. Untouched endpoints keep their exact route.
 * This proposes routes; the caller still checks the resolved drawing for defects.
 */
export function rerouteMovedEdges(
  graph: LayoutGraph,
  original: LayoutResult,
  nodes: LayoutResult["nodes"],
  constraints: readonly Constraint[] = [],
): LayoutResult {
  const shifts = boxShifts(original.nodes, nodes);
  if ([...shifts.values()].every(([x, y]) => x === 0 && y === 0))
    return original;
  const sides = new Set(
    constraints.filter((c) => c.kind === "side").map((c) => c.edge),
  );
  const fixed = new Set<string>();
  const edges = { ...original.edges };
  for (const edge of graph.edges) {
    const from = shifts.get(edge.from)!,
      to = shifts.get(edge.to)!;
    if (from.every((v) => v === 0) && to.every((v) => v === 0)) {
      fixed.add(edge.id);
      continue;
    }
    edges[edge.id] = movedRoute(
      graph,
      edge,
      original.edges[edge.id],
      nodes,
      from,
      to,
      sides.has(edge.id),
    );
    if (sides.has(edge.id)) fixed.add(edge.id);
  }
  return routeSelfEdges(graph, { ...original, nodes, edges }, fixed);
}

function boxShifts(
  before: LayoutResult["nodes"],
  after: LayoutResult["nodes"],
) {
  return new Map(
    Object.entries(after).map(([id, box]) => [
      id,
      [box[0] - before[id][0], box[1] - before[id][1]] as LayoutPoint,
    ]),
  );
}

function movedRoute(
  graph: LayoutGraph,
  edge: LayoutGraph["edges"][number],
  route: LayoutRoute,
  nodes: LayoutResult["nodes"],
  from: LayoutPoint,
  to: LayoutPoint,
  ports: boolean,
): LayoutRoute {
  if (from[0] === to[0] && from[1] === to[1])
    return {
      points: route.points.map((p) => translate(p, from)),
      ...(route.label ? { label: translate(route.label, from) } : {}),
    };
  const points = ports
    ? movedPortRoute(route.points, from, to, [nodes[edge.from], nodes[edge.to]])
    : crossLaneRoute(
        nodes[edge.from],
        nodes[edge.to],
        routeRight(graph, nodes, edge),
      );
  return {
    points,
    ...(edge.label
      ? { label: besideRoute(points, edge.label.width, edge.label.height) }
      : {}),
  };
}

function translate([x, y]: LayoutPoint, [dx, dy]: LayoutPoint): LayoutPoint {
  return [x + dx, y + dy];
}

/** Aligned boxes connect across the rank, rather than through their interiors. */
function routeRight(
  graph: LayoutGraph,
  nodes: LayoutResult["nodes"],
  edge: LayoutGraph["edges"][number],
): boolean {
  const right = graph.direction === "right",
    axis = right ? 0 : 1;
  const a = nodes[edge.from],
    b = nodes[edge.to];
  const overlap =
    a[axis] < b[axis] + b[axis + 2] && b[axis] < a[axis] + a[axis + 2];
  return overlap ? !right : right;
}
