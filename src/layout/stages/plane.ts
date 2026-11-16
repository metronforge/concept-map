/**
 * Plane geometry for the quality report. Every distance is signed: positive is
 * the clear gap between two shapes, negative is how deep they overlap.
 */
export type Vec = readonly [number, number];
/** Left, top, width, height — the same tuple as a node box. */
export type Rect = readonly [number, number, number, number];

const EPS = 1e-9;
const sub = (a: Vec, b: Vec): Vec => [a[0] - b[0], a[1] - b[1]];
const cross = (a: Vec, b: Vec) => a[0] * b[1] - a[1] * b[0];
const dot = (a: Vec, b: Vec) => a[0] * b[0] + a[1] * b[1];
const same = (a: Vec, b: Vec) => Math.hypot(...sub(a, b)) < 1e-7;

/** Signed gap between two rectangles. */
export function rectGap(a: Rect, b: Rect): number {
  const dx = Math.max(a[0] - (b[0] + b[2]), b[0] - (a[0] + a[2]));
  const dy = Math.max(a[1] - (b[1] + b[3]), b[1] - (a[1] + a[3]));
  return Math.max(dx, dy);
}

/** Signed gap between a circle and a rectangle. */
export function circleRectGap(c: Vec, r: number, b: Rect): number {
  const dx = Math.max(b[0] - c[0], 0, c[0] - b[0] - b[2]);
  const dy = Math.max(b[1] - c[1], 0, c[1] - b[1] - b[3]);
  if (dx > 0 || dy > 0) return Math.hypot(dx, dy) - r;
  const inside = Math.min(
    c[0] - b[0],
    b[0] + b[2] - c[0],
    c[1] - b[1],
    b[1] + b[3] - c[1],
  );
  return -inside - r;
}

export const circleGap = (a: Vec, ra: number, b: Vec, rb: number) =>
  Math.hypot(...sub(a, b)) - ra - rb;

function pointSegment(p: Vec, a: Vec, b: Vec): number {
  const ab = sub(b, a),
    len = dot(ab, ab);
  const t = len < EPS ? 0 : Math.max(0, Math.min(1, dot(sub(p, a), ab) / len));
  return Math.hypot(p[0] - a[0] - t * ab[0], p[1] - a[1] - t * ab[1]);
}

function segmentsMeet(a: Vec, b: Vec, c: Vec, d: Vec): boolean {
  const d1 = cross(sub(b, a), sub(c, a)),
    d2 = cross(sub(b, a), sub(d, a)),
    d3 = cross(sub(d, c), sub(a, c)),
    d4 = cross(sub(d, c), sub(b, c));
  if (
    ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) &&
    ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))
  )
    return true;
  const on = (p: Vec, q: Vec, r: Vec) =>
    Math.abs(cross(sub(q, p), sub(r, p))) < EPS &&
    Math.min(p[0], q[0]) - EPS <= r[0] &&
    r[0] <= Math.max(p[0], q[0]) + EPS &&
    Math.min(p[1], q[1]) - EPS <= r[1] &&
    r[1] <= Math.max(p[1], q[1]) + EPS;
  return on(a, b, c) || on(a, b, d) || on(c, d, a) || on(c, d, b);
}

const corners = (r: Rect): Vec[] => [
  [r[0], r[1]],
  [r[0] + r[2], r[1]],
  [r[0] + r[2], r[1] + r[3]],
  [r[0], r[1] + r[3]],
];

function segmentTouchesRect(a: Vec, b: Vec, r: Rect): boolean {
  const inside = (p: Vec) =>
    p[0] >= r[0] && p[0] <= r[0] + r[2] && p[1] >= r[1] && p[1] <= r[1] + r[3];
  const c = corners(r);
  return (
    inside(a) ||
    inside(b) ||
    c.some((p, k) => segmentsMeet(a, b, p, c[(k + 1) % 4]))
  );
}

/** Distance between a segment and a rectangle that do not touch. */
function segmentRectDistance(a: Vec, b: Vec, r: Rect): number {
  const c = corners(r);
  let best = Infinity;
  for (let k = 0; k < 4; k++) {
    const p = c[k],
      q = c[(k + 1) % 4];
    best = Math.min(
      best,
      pointSegment(a, p, q),
      pointSegment(b, p, q),
      pointSegment(p, a, b),
    );
  }
  return best;
}

/** Shortest move that separates a segment from a rectangle it touches. */
function segmentRectDepth(a: Vec, b: Vec, r: Rect): number {
  const axes: Vec[] = [
    [1, 0],
    [0, 1],
  ];
  const ab = sub(b, a),
    len = Math.hypot(...ab);
  if (len > EPS) axes.push([-ab[1] / len, ab[0] / len]);
  let depth = Infinity;
  for (const axis of axes) {
    const seg = [dot(a, axis), dot(b, axis)];
    const box = corners(r).map((c) => dot(c, axis));
    depth = Math.min(
      depth,
      Math.max(...seg) - Math.min(...box),
      Math.max(...box) - Math.min(...seg),
    );
  }
  return depth;
}

/**
 * Signed gap between a segment and a rectangle. Apart: the Euclidean distance.
 * Overlapping: minus the shortest move that separates them along x, y or the
 * segment's normal.
 */
export const segmentRectGap = (a: Vec, b: Vec, r: Rect): number =>
  segmentTouchesRect(a, b, r)
    ? -segmentRectDepth(a, b, r)
    : segmentRectDistance(a, b, r);

function intersection(a: Vec, b: Vec, c: Vec, d: Vec): Vec | undefined {
  const r = sub(b, a),
    s = sub(d, c),
    den = cross(r, s);
  if (Math.abs(den) < 1e-7) return undefined; // collinear overlap is not a crossing
  const t = cross(sub(c, a), s) / den,
    u = cross(sub(c, a), r) / den;
  if (t < -1e-7 || t > 1 + 1e-7 || u < -1e-7 || u > 1 + 1e-7) return undefined;
  return [a[0] + t * r[0], a[1] + t * r[1]];
}

function rays(path: Vec[], p: Vec): [Vec, Vec] | undefined {
  if (same(path[0], p) || same(path[path.length - 1], p)) return undefined;
  const vertex = path.findIndex((v) => same(v, p));
  if (vertex > 0) return [sub(path[vertex - 1], p), sub(path[vertex + 1], p)];
  for (let i = 1; i < path.length; i++) {
    const a = sub(path[i - 1], p),
      b = sub(path[i], p);
    if (Math.abs(cross(a, b)) < 1e-7 && dot(a, b) < 0) return [a, b];
  }
  return undefined;
}

/** True when the two lines pass through each other at p, not just touch. */
function crossesAt(a: Vec[], b: Vec[], p: Vec): boolean {
  const ar = rays(a, p),
    br = rays(b, p);
  if (!ar || !br) return false;
  const directions = [
    ...ar.map((v) => ({ angle: Math.atan2(v[1], v[0]), id: 0 })),
    ...br.map((v) => ({ angle: Math.atan2(v[1], v[0]), id: 1 })),
  ].sort((x, y) => x.angle - y.angle);
  return directions.every((d, i) => {
    const next = directions[(i + 1) % 4];
    const angle = (next.angle - d.angle + 2 * Math.PI) % (2 * Math.PI);
    return d.id !== next.id && angle > 1e-7;
  });
}

/** Points where two polylines pass through each other; touching is not counted. */
export function crossings(a: Vec[], b: Vec[]): Vec[] {
  const found: Vec[] = [];
  for (let i = 1; i < a.length; i++)
    for (let j = 1; j < b.length; j++) {
      const p = intersection(a[i - 1], a[i], b[j - 1], b[j]);
      if (p && !found.some((q) => same(p, q)) && crossesAt(a, b, p))
        found.push(p);
    }
  return found;
}
