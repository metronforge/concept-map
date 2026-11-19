import type { LayoutBox, LayoutPoint } from "../types.js";
import type { Vec } from "./plane.js";
import { badgeCandidates } from "./badge-candidates.js";
import { segmentRectGap } from "./plane.js";

export type Segment = readonly [Vec, Vec];

/** A bounded set beside each part of the label's own route. */
export function* labelCandidates(
  box: LayoutBox,
  route: Segment[],
  limit: number,
  obstacles: LayoutBox[],
) {
  for (const [a, b] of route)
    for (let part = 0; part <= 16; part++) {
      const x = a[0] + ((b[0] - a[0]) * part) / 16;
      const y = a[1] + ((b[1] - a[1]) * part) / 16;
      for (const dx of [-box[2] - 4, -box[2] / 2, 4])
        for (const dy of [-box[3] - 4, -box[3] / 2, 4])
          yield [x + dx, y + dy] as LayoutPoint;
    }
  yield* badgeCandidates([box[0], box[1]], limit);
  yield* obstacleCandidates(box, obstacles);
}

/** Sample narrow slots that regular route and radial intervals can miss. */
function* obstacleCandidates(box: LayoutBox, obstacles: LayoutBox[]) {
  const boundaries = (axis: 0 | 1) => [
    box[axis],
    ...obstacles.flatMap((other) => [
      other[axis] - box[axis + 2] - 1 / 64,
      other[axis] + other[axis + 2] + 1 / 64,
    ]),
  ];
  const xs = boundaries(0),
    ys = boundaries(1);
  for (const x of xs) for (const y of ys) yield [x, y] as LayoutPoint;
}

/** Prefer the own route over unrelated arrows, then the smallest move. */
export function labelCost(
  box: LayoutBox,
  origin: LayoutBox,
  own: Segment[],
  other: Segment[],
  limit: number,
) {
  const gap = (segments: Segment[]) =>
    Math.min(...segments.map(([a, b]) => segmentRectGap(a, b, box)));
  const distance = gap(own);
  return (
    (gap(other) < distance ? 4 * limit : 0) +
    distance +
    Math.hypot(box[0] - origin[0], box[1] - origin[1])
  );
}
