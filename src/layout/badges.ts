import type {
  LayoutGraph,
  LayoutResult,
  LayoutPoint,
  LayoutBox,
} from "./types.js";
import { midpoint } from "./geometry.js";
import { firstClear, clearOf } from "./stages/badge-placement.js";
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
  return Object.fromEntries(
    graph.edges.map((edge) => {
      const points = result.edges[edge.id].points;
      return [
        edge.id,
        firstClear(
          routeCandidates(points),
          (point) => obstacles.every((box) => clearOf(point, box, 4)),
          midpoint(points),
        ),
      ];
    }),
  );
}

/** Legacy route candidates only seed the fixed viewport; selection is shared. */
function* routeCandidates(points: LayoutPoint[]) {
  const middle = midpoint(points);
  const candidates: LayoutPoint[] = [middle];
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1],
      b = points[i];
    for (let t = 0; t <= 1; t += 1 / 32)
      candidates.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
  }
  const distance = (p: LayoutPoint) =>
    Math.hypot(p[0] - middle[0], p[1] - middle[1]);
  yield* candidates.sort((a, b) => distance(a) - distance(b));
  for (let offset = 16; ; offset += 16) {
    yield [middle[0] + offset, middle[1]] as LayoutPoint;
    yield [middle[0] - offset, middle[1]] as LayoutPoint;
    yield [middle[0], middle[1] + offset] as LayoutPoint;
    yield [middle[0], middle[1] - offset] as LayoutPoint;
  }
}
