import type {
  LayoutBox,
  LayoutGraph,
  LayoutPoint,
  LayoutResult,
} from "../types.js";

type Side = "top" | "right" | "bottom" | "left";

/** Preserve the engine's ports while translating them with their boxes. */
export function channelInput(
  graph: LayoutGraph,
  original: LayoutResult,
  nodes: LayoutResult["nodes"],
) {
  const edges = [];
  for (const { id, from, to } of graph.edges) {
    const points = original.edges[id]?.points;
    if (!points || points.length < 2) return null;
    const start = terminal(from, points[0], original.nodes[from], nodes[from]);
    const end = terminal(to, points.at(-1)!, original.nodes[to], nodes[to]);
    if (!start || !end) return null;
    edges.push({ id, from: start, to: end });
  }
  return {
    nodes: Object.entries(nodes).map(([id, box]) => ({ id, box })),
    edges,
  };
}

function terminal(
  id: string,
  point: LayoutPoint,
  before: LayoutBox,
  after: LayoutBox,
) {
  const [px, py] = point,
    [x, y, width, height] = before;
  const sides: Side[] = [];
  if (x <= px && px <= x + width && py <= y) sides.push("top");
  if (y <= py && py <= y + height && px >= x + width) sides.push("right");
  if (x <= px && px <= x + width && py >= y + height) sides.push("bottom");
  if (y <= py && py <= y + height && px <= x) sides.push("left");
  if (!sides.length) return null;
  return {
    id,
    kind: "node" as const,
    point: [px + after[0] - x, py + after[1] - y] as LayoutPoint,
    sides,
  };
}
