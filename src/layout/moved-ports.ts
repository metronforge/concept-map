import type { LayoutBox, LayoutPoint } from "./types.js";
import { bounds } from "./geometry.js";
import { segmentRectGap } from "./stages/plane.js";

/** Reconnect engine ports outside their endpoint boxes; other obstacles remain
 * the caller's responsibility, as with the existing cross-lane routing.
 */
export function movedPortRoute(
  points: LayoutPoint[],
  from: LayoutPoint,
  to: LayoutPoint,
  boxes: LayoutBox[],
): LayoutPoint[] {
  const a = translate(points[0], from),
    b = translate(points.at(-1)!, to);
  const first = points.find(
    (p) => p[0] !== points[0][0] || p[1] !== points[0][1],
  )!;
  const last = points.findLast(
    (p) => p[0] !== points.at(-1)![0] || p[1] !== points.at(-1)![1],
  )!;
  const aa = stub(a, points[0], first),
    bb = stub(b, points.at(-1)!, last);
  const routes = connectors(aa, bb, boxes).map((route) => [a, ...route, b]);
  const clear = routes.filter((route) =>
    route
      .slice(1)
      .every((p, i) => boxes.every((box) => clearsBox(route[i], p, box))),
  );
  clear.sort((one, two) => length(one) - length(two));
  if (!clear.length)
    throw new Error(
      "Cannot reconnect ports without crossing their endpoint boxes",
    );
  return clear[0];
}

function connectors(
  a: LayoutPoint,
  b: LayoutPoint,
  boxes: LayoutBox[],
): LayoutPoint[][] {
  const [x, y, w, h] = bounds(boxes);
  const xs = [x - 12, x + w + 12],
    ys = [y - 12, y + h + 12];
  return [
    ...[(a[0] + b[0]) / 2, ...xs].map((cx): LayoutPoint[] => [
      a,
      [cx, a[1]],
      [cx, b[1]],
      b,
    ]),
    ...[(a[1] + b[1]) / 2, ...ys].map((cy): LayoutPoint[] => [
      a,
      [a[0], cy],
      [b[0], cy],
      b,
    ]),
    ...outsideConnectors(a, b, xs, ys),
    ...outsideConnectors([a[1], a[0]], [b[1], b[0]], ys, xs).map((route) =>
      route.map(([px, py]): LayoutPoint => [py, px]),
    ),
  ];
}

/** When two opposed ports face away, pass around the endpoint boxes. */
function outsideConnectors(
  a: LayoutPoint,
  b: LayoutPoint,
  xs: number[],
  ys: number[],
): LayoutPoint[][] {
  return xs.flatMap((x) =>
    ys.flatMap((y1) =>
      ys.map((y2): LayoutPoint[] => [
        a,
        [a[0], y1],
        [x, y1],
        [x, y2],
        [b[0], y2],
        b,
      ]),
    ),
  );
}

function length(points: LayoutPoint[]): number {
  return points
    .slice(1)
    .reduce(
      (sum, p, i) =>
        sum + Math.abs(p[0] - points[i][0]) + Math.abs(p[1] - points[i][1]),
      0,
    );
}

function translate([x, y]: LayoutPoint, [dx, dy]: LayoutPoint): LayoutPoint {
  return [x + dx, y + dy];
}

function stub(
  point: LayoutPoint,
  end: LayoutPoint,
  next: LayoutPoint,
): LayoutPoint {
  return [
    point[0] + Math.sign(next[0] - end[0]) * 12,
    point[1] + Math.sign(next[1] - end[1]) * 12,
  ];
}

function clearsBox(a: LayoutPoint, b: LayoutPoint, box: LayoutBox): boolean {
  // As at side attachments, allow arithmetic roundoff, never a visible crossing.
  const rounding =
    Number.EPSILON * 8 * Math.max(1, ...[...a, ...b, ...box].map(Math.abs));
  return segmentRectGap(a, b, box) >= -rounding;
}
