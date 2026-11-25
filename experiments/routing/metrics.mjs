import { createHash } from "node:crypto";
import { check } from "../../dist/layout/index.js";
import { polylines } from "../../dist/layout/stages/paths.js";
import { bends } from "../../scripts/comparison/metrics.mjs";

export const hash = (value) => createHash("sha256").update(value).digest("hex");

/** Sum drawn segments only; moveto gaps are not part of the route. */
export function routeLength(paths) {
  let length = 0;
  for (const path of paths)
    for (const points of polylines(path))
      for (let i = 1; i < points.length; i++)
        length += Math.hypot(
          points[i][0] - points[i - 1][0],
          points[i][1] - points[i - 1][1],
        );
  return length;
}

export function measure({ id, source, resolved }) {
  const paths = Object.values(resolved.edges).map((edge) => edge.path);
  return {
    id,
    candidate: "current",
    resolvedSha256: hash(JSON.stringify(resolved)),
    nodes: Object.keys(resolved.nodes).length,
    edges: paths.length,
    quality: check(source, resolved),
    bends: bends(paths),
    routeLength: routeLength(paths),
    routingTimeMs: null,
  };
}

/** These are separate totals, never a combined quality score. */
export function totals(reports) {
  const sum = (get) =>
    reports.reduce((total, report) => total + get(report), 0);
  return {
    maps: reports.length,
    edges: sum((r) => r.edges),
    hard: sum((r) => r.quality.hard),
    crossings: sum((r) => r.quality.crossings.count),
    bends: sum((r) => r.bends),
    routeLength: sum((r) => r.routeLength),
  };
}
