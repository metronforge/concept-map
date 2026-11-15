import type { LayoutBox, LayoutPoint } from "./types.js";
export function bounds(boxes: LayoutBox[]): LayoutBox {
  if (!boxes.length) return [0, 0, 60, 36];
  const x = Math.min(...boxes.map((b) => b[0])),
    y = Math.min(...boxes.map((b) => b[1]));
  return [
    x,
    y,
    Math.max(...boxes.map((b) => b[0] + b[2])) - x,
    Math.max(...boxes.map((b) => b[1] + b[3])) - y,
  ];
}
export function midpoint(points: LayoutPoint[]): LayoutPoint {
  const lengths = points
    .slice(1)
    .map((p, i) => Math.hypot(p[0] - points[i][0], p[1] - points[i][1]));
  let distance = lengths.reduce((a, b) => a + b, 0) / 2;
  for (let i = 0; i < lengths.length; i++) {
    if (distance <= lengths[i] && lengths[i] > 0) {
      const fraction = distance / lengths[i],
        a = points[i],
        b = points[i + 1];
      return [a[0] + (b[0] - a[0]) * fraction, a[1] + (b[1] - a[1]) * fraction];
    }
    distance -= lengths[i];
  }
  return [...points[0]];
}
export function crossLaneRoute(
  from: LayoutBox,
  to: LayoutBox,
  right = false,
): LayoutPoint[] {
  if (right) {
    const swap = ([x, y, w, h]: LayoutBox): LayoutBox => [y, x, h, w];
    return crossLaneRoute(swap(from), swap(to)).map(([x, y]) => [y, x]);
  }
  const downward = from[1] < to[1];
  const a: LayoutPoint = [
    from[0] + from[2] / 2,
    from[1] + (downward ? from[3] : 0),
  ];
  const b: LayoutPoint = [to[0] + to[2] / 2, to[1] + (downward ? 0 : to[3])];
  const y = (a[1] + b[1]) / 2;
  return [a, [a[0], y], [b[0], y], b];
}
