import type { LayoutPoint as Point, LayoutBox as Box } from "../types.js";
import { badgeCandidates } from "./badge-candidates.js";

export function clearOf([x, y]: Point, [left, top, w, h]: Box, margin: number) {
  return (
    Math.hypot(
      Math.max(left - x, 0, x - left - w),
      Math.max(top - y, 0, y - top - h),
    ) >=
    8 + margin
  );
}

/** Keep clear numbers; otherwise take the nearest clear candidate. */
export function placeBadge(
  origin: Point,
  obstacles: Box[],
  bounds: Point,
  search: Box[] = obstacles,
): Point {
  if (obstacles.every((box) => clearOf(origin, box, 0))) return origin;
  const clear = ([x, y]: Point) =>
    x >= 8 &&
    y >= 8 &&
    x <= bounds[0] - 8 &&
    y <= bounds[1] - 8 &&
    search.every((box) => clearOf([x, y], box, 3));
  return firstClear(
    badgeCandidates(origin, Math.hypot(...bounds)),
    clear,
    origin,
  );
}

/** All number candidates are ordered by movement cost before this search. */
export function firstClear(
  candidates: Iterable<Point>,
  clear: (point: Point) => boolean,
  fallback: Point,
): Point {
  for (const candidate of candidates) if (clear(candidate)) return candidate;
  return fallback;
}
