import type { LayoutPoint } from "./types.js";

/** Keep the engine's bends. Only the chosen segment changes along each axis;
 * the caller must reject a stretched route if the drawing gains hard defects.
 */
export function stretchRoute(
  points: LayoutPoint[],
  from: LayoutPoint,
  to: LayoutPoint,
): LayoutPoint[] {
  const cuts = ([0, 1] as const).map((axis) =>
    stretchSegment(points, axis, from[axis], to[axis]),
  );
  return points.map(([x, y], i) => [
    x + (i < cuts[0] ? from[0] : to[0]),
    y + (i < cuts[1] ? from[1] : to[1]),
  ]);
}

/** A stationary end keeps its bends. When both ends move, put their relative
 * displacement in the longest segment (first in route order breaks ties).
 * With no extent on this axis, use a geometric segment, not a duplicate point.
 */
function stretchSegment(
  points: LayoutPoint[],
  axis: 0 | 1,
  from: number,
  to: number,
): number {
  let segments = axisSegments(points, axis);
  if (!segments.length) segments = axisSegments(points, axis === 0 ? 1 : 0);
  if (to === 0) return segments[0] ?? 1;
  if (from === 0) return segments.at(-1) ?? points.length - 1;
  const length = (i: number) => Math.abs(points[i][axis] - points[i - 1][axis]);
  return segments.reduce(
    (longest, i) => (length(i) > length(longest) ? i : longest),
    segments[0] ?? 1,
  );
}

function axisSegments(points: LayoutPoint[], axis: 0 | 1): number[] {
  return points
    .slice(1)
    .flatMap((p, i) => (p[axis] === points[i][axis] ? [] : [i + 1]));
}
