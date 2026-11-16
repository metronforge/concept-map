import { check } from "../../dist/layout/index.js";
import { polylines } from "../../dist/layout/stages/paths.js";

const EPS = 1e-7;
const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
const cross = (a, b) => a[0] * b[1] - a[1] * b[0];

/** Changes of direction along each arrow; a comparison figure, not a defect. */
export function bends(paths) {
  let count = 0;
  for (const path of paths)
    for (const p of polylines(path))
      for (let k = 1; k < p.length - 1; k++) {
        const a = sub(p[k], p[k - 1]),
          b = sub(p[k + 1], p[k]);
        if (Math.abs(cross(a, b)) > EPS || a[0] * b[0] + a[1] * b[1] < 0)
          count++;
      }
  return count;
}

/**
 * The quality report of the library (`check`) plus the comparison-only
 * figures: bends and area. Every variant is judged against the same source.
 */
export function geometryMetrics(source, map) {
  const quality = check(source, map);
  return {
    quality,
    crossings: quality.crossings.count,
    hard: quality.hard,
    reading: quality.reading.share,
    bends: bends(Object.values(map.edges).map((e) => e.path)),
    area: map.viewBox[0] * map.viewBox[1],
    width: map.viewBox[0],
    height: map.viewBox[1],
  };
}
