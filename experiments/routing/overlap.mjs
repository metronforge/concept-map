import { polylines } from "../../dist/layout/stages/paths.js";

function segments({ id, path }) {
  const straight = [];
  let ignoredDiagonalSegments = 0,
    ignoredDiagonalLength = 0;
  for (const points of polylines(path, true)) {
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1],
        b = points[i];
      if (a[0] !== b[0] && a[1] !== b[1]) {
        ignoredDiagonalSegments++;
        ignoredDiagonalLength += Math.hypot(b[0] - a[0], b[1] - a[1]);
        continue;
      }
      const along = a[1] === b[1] ? 0 : 1;
      if (a[along] === b[along]) continue;
      straight.push({
        axis: along === 0 ? "x" : "y",
        coordinate: a[1 - along],
        start: Math.min(a[along], b[along]),
        end: Math.max(a[along], b[along]),
      });
    }
  }
  return { id, straight, ignoredDiagonalSegments, ignoredDiagonalLength };
}

function union(spans) {
  spans.sort(
    (a, b) =>
      (a.axis < b.axis ? -1 : a.axis > b.axis ? 1 : 0) ||
      a.coordinate - b.coordinate ||
      a.start - b.start ||
      a.end - b.end,
  );
  const merged = [];
  for (const span of spans) {
    const last = merged.at(-1);
    if (
      last &&
      last.axis === span.axis &&
      last.coordinate === span.coordinate &&
      span.start <= last.end
    )
      last.end = Math.max(last.end, span.end);
    else merged.push({ ...span });
  }
  return merged;
}

function pair(a, b) {
  const spans = [];
  for (const [i, first] of a.straight.entries()) {
    for (let j = a === b ? i + 1 : 0; j < b.straight.length; j++) {
      const second = b.straight[j];
      if (first.axis !== second.axis || first.coordinate !== second.coordinate)
        continue;
      const start = Math.max(first.start, second.start);
      const end = Math.min(first.end, second.end);
      if (start < end) spans.push({ ...first, start, end });
    }
  }
  const merged = union(spans);
  return {
    edges: [a.id, b.id],
    length: merged.reduce((sum, span) => sum + (span.end - span.start), 0),
    spans: merged,
  };
}

/** Exact orthogonal overlaps; pair lengths are not a checker defect score. */
export function overlapAudit(paths) {
  const routes = paths.map(segments);
  const pairs = [],
    retraced = [];
  for (const [i, a] of routes.entries()) {
    for (let j = i; j < routes.length; j++) {
      const result = pair(a, routes[j]);
      if (result.length > 0) (i === j ? retraced : pairs).push(result);
    }
  }
  const sum = (items, key) => items.reduce((n, item) => n + item[key], 0);
  return {
    pairs,
    retraced,
    sharedLength: sum(pairs, "length"),
    retracedLength: sum(retraced, "length"),
    ignoredDiagonalSegments: sum(routes, "ignoredDiagonalSegments"),
    ignoredDiagonalLength: sum(routes, "ignoredDiagonalLength"),
  };
}
