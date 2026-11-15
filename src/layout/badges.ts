import type {
  LayoutGraph,
  LayoutResult,
  LayoutPoint,
  LayoutBox,
} from "./types.js";
import { midpoint } from "./geometry.js";
/** Keep the badge radius and a small gap clear of every label and node. */
export function badgePositions(
  graph: LayoutGraph,
  result: LayoutResult,
): Record<string, LayoutPoint> {
  const obstacles: LayoutBox[] = [...Object.values(result.nodes)];
  for (const edge of graph.edges) {
    if (!edge.label) continue;
    const route = result.edges[edge.id];
    const [x, y] = route.label ?? midpoint(route.points);
    obstacles.push([
      x - edge.label.width / 2,
      y - (edge.label.height * 2) / 3,
      edge.label.width,
      edge.label.height,
    ]);
  }
  const clear = ([x, y]: LayoutPoint) =>
    obstacles.every(
      ([left, top, w, h]) =>
        Math.hypot(
          Math.max(left - x, 0, x - left - w),
          Math.max(top - y, 0, y - top - h),
        ) >= 12,
    );
  return Object.fromEntries(
    graph.edges.map((edge) => {
      const points = result.edges[edge.id].points;
      return [edge.id, freeBadge(points, clear)];
    }),
  );
}

function freeBadge(
  points: LayoutPoint[],
  clear: (p: LayoutPoint) => boolean,
): LayoutPoint {
  const middle = midpoint(points);
  const candidates: LayoutPoint[] = [middle];
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1],
      b = points[i];
    for (let t = 0; t <= 1; t += 1 / 32)
      candidates.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
  }
  candidates.sort(
    (a, b) =>
      Math.hypot(a[0] - middle[0], a[1] - middle[1]) -
      Math.hypot(b[0] - middle[0], b[1] - middle[1]),
  );
  let badge = candidates.find(clear);
  // Very short routes can have no free point. Move beside the route instead.
  for (let offset = 16; !badge; offset += 16) {
    badge = (
      [
        [middle[0] + offset, middle[1]],
        [middle[0] - offset, middle[1]],
        [middle[0], middle[1] + offset],
        [middle[0], middle[1] - offset],
      ] as LayoutPoint[]
    ).find(clear);
  }
  return badge;
}
