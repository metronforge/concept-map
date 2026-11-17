import type { Vec } from "./plane.js";

/** SVG endpoint-to-centre conversion, followed by the same 16 chords as curves.
 * https://www.w3.org/TR/SVG/implnote.html#ArcConversionEndpointToCenter */
export function arcPoints(start: Vec, end: Vec, values: number[]): Vec[] {
  if (start[0] === end[0] && start[1] === end[1]) return [];
  const [rx, ry, rotation, large, sweep] = values;
  if (!rx || !ry) return [end];
  const angle = (rotation * Math.PI) / 180;
  const cos = Math.cos(angle),
    sin = Math.sin(angle);
  const rotate = (x: number, y: number): Vec => [
    cos * x - sin * y,
    sin * x + cos * y,
  ];
  const dx = (start[0] - end[0]) / 2,
    dy = (start[1] - end[1]) / 2;
  const ellipse = arcCentre(
    Math.abs(rx),
    Math.abs(ry),
    cos * dx + sin * dy,
    -sin * dx + cos * dy,
    large === sweep,
  );
  const offset = rotate(ellipse.rx * ellipse.cx, ellipse.ry * ellipse.cy);
  const from = Math.atan2(ellipse.y - ellipse.cy, ellipse.x - ellipse.cx);
  let span =
    Math.atan2(-ellipse.y - ellipse.cy, -ellipse.x - ellipse.cx) - from;
  if (sweep && span < 0) span += 2 * Math.PI;
  if (!sweep && span > 0) span -= 2 * Math.PI;
  return Array.from({ length: 16 }, (_, i) => {
    if (i === 15) return end;
    const theta = from + (span * (i + 1)) / 16;
    const point = rotate(
      ellipse.rx * Math.cos(theta),
      ellipse.ry * Math.sin(theta),
    );
    return [
      point[0] + offset[0] + (start[0] + end[0]) / 2,
      point[1] + offset[1] + (start[1] + end[1]) / 2,
    ];
  });
}

function arcCentre(
  rx: number,
  ry: number,
  dx: number,
  dy: number,
  negative: boolean,
) {
  const scale = Math.max(1, Math.hypot(dx / rx, dy / ry));
  rx *= scale;
  ry *= scale;
  const x = dx / rx,
    y = dy / ry,
    length = x * x + y * y;
  const factor =
    (negative ? -1 : 1) * Math.sqrt(Math.max(0, (1 - length) / length));
  return { rx, ry, x, y, cx: factor * y, cy: -factor * x };
}
