import type { LayoutBox } from "../types.js";
import { rectGap, segmentRectGap } from "./plane.js";
import type { Segment } from "./label-candidates.js";

type Gap = (box: LayoutBox) => number;
const margin = 1 / 64;

/** Cache fixed route bounds; exact distances are needed only nearby. */
export function lineGaps(lines: Segment[]): Gap[] {
  return lines.map(([a, b]) => {
    const bounds: LayoutBox = [
      Math.min(a[0], b[0]),
      Math.min(a[1], b[1]),
      Math.abs(b[0] - a[0]),
      Math.abs(b[1] - a[1]),
    ];
    return (box) =>
      rectGap(box, bounds) >= margin ? margin : segmentRectGap(a, b, box);
  });
}

// Count penetration in finite units so gradual repairs cannot oscillate.
const penetration = (gap: number) =>
  Math.max(0, Math.ceil((margin - gap) / margin));

/** A move must reduce penetration and never introduce or deepen a contact. */
export function contactReduction(origin: LayoutBox, gaps: Gap[]) {
  const previous = gaps.map((gap) => Math.min(margin, gap(origin)));
  if (previous.every((gap) => gap >= 0)) return undefined;
  const initial = previous.reduce((sum, gap) => sum + penetration(gap), 0);
  return (box: LayoutBox) => {
    let remaining = 0;
    for (let i = 0; i < gaps.length; i++) {
      const gap = gaps[i](box);
      if (gap < previous[i]) return Infinity;
      remaining += penetration(gap);
      if (remaining >= initial) return Infinity;
    }
    return remaining;
  };
}
