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
