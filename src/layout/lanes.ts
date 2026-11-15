import type {
  LayoutGraph,
  LayoutNode,
  LayoutResult,
  LayoutBox,
} from "./types.js";
import { bounds, crossLaneRoute, midpoint } from "./geometry.js";
/** Empty partitions need an engine vertex to reserve their place. IDs cannot collide. */
export function engineNodes(graph: LayoutGraph): LayoutNode[] {
  return [
    ...graph.nodes,
    ...graph.lanes.flatMap((l, i) =>
      graph.nodes.some((n) => n.lane === l.id)
        ? []
        : [
            {
              id: `$lane${i}`,
              lane: l.id,
              width: Math.max(60, l.label.width + 24),
              height: 36,
            },
          ],
    ),
  ];
}
export function laneBoxes(
  graph: LayoutGraph,
  nodes: LayoutNode[],
  boxes: Record<string, LayoutBox>,
): Record<string, LayoutBox> {
  const width = Math.max(
    60,
    ...Object.values(boxes).map((b) => b[0] + b[2] + 12),
    ...graph.lanes.map((l) => l.label.width + 32),
  );
  return Object.fromEntries(
    graph.lanes.map((l) => {
      const b = bounds(
        nodes.filter((n) => n.lane === l.id).map((n) => boxes[n.id]),
      );
      return [l.id, [0, b[1] - 24, width, b[3] + 36]];
    }),
  );
}
/** Dagre has no partition constraint: retain intra-lane geometry, stack partitions,
 * then route cross-partition edges between the relocated node boundaries. */
export function partitionDagre(
  graph: LayoutGraph,
  nodes: LayoutNode[],
  result: LayoutResult,
): LayoutResult {
  if (!graph.lanes.length) return result;
  const offsets = new Map<string, number>();
  let top = 24;
  for (const lane of [...graph.lanes.map((l) => l.id), undefined]) {
    const group = nodes.filter((n) => n.lane === lane);
    if (!group.length) continue;
    const b = bounds(group.map((n) => result.nodes[n.id]));
    const dy = top - b[1];
    for (const n of group) {
      result.nodes[n.id][1] += dy;
      offsets.set(n.id, dy);
    }
    top += b[3] + 64;
  }
  for (const e of graph.edges) {
    const route = result.edges[e.id],
      dy = offsets.get(e.from)!;
    if (dy === offsets.get(e.to)) {
      route.points = route.points.map((p) => [p[0], p[1] + dy]);
      if (route.label) route.label = [route.label[0], route.label[1] + dy];
    } else {
      route.points = crossLaneRoute(result.nodes[e.from], result.nodes[e.to]);
      if (e.label) route.label = midpoint(route.points);
    }
  }
  result.lanes = laneBoxes(graph, nodes, result.nodes);
  for (const n of nodes) if (n.id.startsWith("$")) delete result.nodes[n.id];
  return result;
}
