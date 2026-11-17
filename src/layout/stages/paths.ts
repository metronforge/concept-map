import { arcPoints } from "./arcs.js";
import type { Vec } from "./plane.js";

const CURVE_STEPS = 16;
const arity: Record<string, number> = {
  m: 2,
  l: 2,
  h: 1,
  v: 1,
  c: 6,
  s: 4,
  q: 4,
  t: 2,
  a: 7,
};
const same = (a: Vec, b: Vec) => Math.hypot(a[0] - b[0], a[1] - b[1]) < 1e-7;
const mirror = (control: Vec, about: Vec): Vec => [
  2 * about[0] - control[0],
  2 * about[1] - control[1],
];

interface Pen {
  lines: Vec[][];
  line: Vec[];
  point: Vec;
  start: Vec;
  /** Last control point, for the smooth commands S and T. */
  control?: Vec;
  previous: string;
}

function push(pen: Pen, p: Vec) {
  if (!pen.line.length || !same(pen.line[pen.line.length - 1], p))
    pen.line.push(p);
}

function cubic(pen: Pen, c1: Vec, c2: Vec, end: Vec) {
  const a = pen.point;
  for (let k = 1; k <= CURVE_STEPS; k++) {
    const t = k / CURVE_STEPS,
      u = 1 - t;
    const w = [u * u * u, 3 * u * u * t, 3 * u * t * t, t * t * t];
    push(pen, [
      w[0] * a[0] + w[1] * c1[0] + w[2] * c2[0] + w[3] * end[0],
      w[0] * a[1] + w[1] * c1[1] + w[2] * c2[1] + w[3] * end[1],
    ]);
  }
  pen.control = c2;
  pen.point = end;
}

function quadratic(pen: Pen, c: Vec, end: Vec) {
  const a = pen.point;
  for (let k = 1; k <= CURVE_STEPS; k++) {
    const t = k / CURVE_STEPS,
      u = 1 - t;
    push(pen, [
      u * u * a[0] + 2 * u * t * c[0] + t * t * end[0],
      u * u * a[1] + 2 * u * t * c[1] + t * t * end[1],
    ]);
  }
  pen.control = c;
  pen.point = end;
}

/** Apply one command with its numbers; `at` resolves relative coordinates. */
function draw(pen: Pen, lower: string, v: number[], rel: boolean) {
  const at = (x: number, y: number): Vec =>
    rel ? [pen.point[0] + x, pen.point[1] + y] : [x, y];
  const smooth = (kinds: string) =>
    pen.control && kinds.includes(pen.previous)
      ? mirror(pen.control, pen.point)
      : pen.point;
  if (lower === "a") {
    const end = at(v[5], v[6]);
    arcPoints(pen.point, end, v).forEach((point) => push(pen, point));
    pen.point = end;
    pen.control = undefined;
  } else if (lower === "c")
    cubic(pen, at(v[0], v[1]), at(v[2], v[3]), at(v[4], v[5]));
  else if (lower === "s")
    cubic(pen, smooth("cs"), at(v[0], v[1]), at(v[2], v[3]));
  else if (lower === "q") quadratic(pen, at(v[0], v[1]), at(v[2], v[3]));
  else if (lower === "t") quadratic(pen, smooth("qt"), at(v[0], v[1]));
  else {
    if (lower === "l") pen.point = at(v[0], v[1]);
    else if (lower === "h")
      pen.point = [v[0] + (rel ? pen.point[0] : 0), pen.point[1]];
    else pen.point = [pen.point[0], v[0] + (rel ? pen.point[1] : 0)];
    push(pen, pen.point);
    pen.control = undefined;
  }
  pen.previous = lower;
}

function move(pen: Pen, to: Vec) {
  if (pen.line.length > 1) pen.lines.push(pen.line);
  pen.line = [];
  pen.point = pen.start = to;
  push(pen, to);
  pen.control = undefined;
  pen.previous = "m";
}

function close(pen: Pen) {
  push(pen, pen.start);
  pen.point = pen.start;
  pen.control = undefined;
  pen.previous = "z";
}

const newPen = (): Pen => ({
  lines: [],
  line: [],
  point: [0, 0],
  start: [0, 0],
  previous: "",
});
const tokenize = (path: string) =>
  path.match(/[a-df-zA-DF-Z]|[-+]?(?:\d*\.\d+|\d+\.?\d*)(?:[eE][-+]?\d+)?/g) ??
  [];

/**
 * An SVG path as polylines, one per subpath. Curves and arcs use 16 chords each.
 */
export function polylines(path: string): Vec[][] {
  const tokens = tokenize(path);
  const fail = (why: string) => new Error(`${why}: ${path}`);
  const pen = newPen();
  let i = 0,
    command = "";
  while (i < tokens.length) {
    if (/^[a-z]$/i.test(tokens[i])) command = tokens[i++];
    const lower = command.toLowerCase();
    if (lower === "z") {
      close(pen);
      command = "";
      continue;
    }
    if (lower === "a") splitArcFlags(tokens, i);
    const count = arity[lower];
    if (!count || i + count > tokens.length || /^[a-z]$/i.test(tokens[i]))
      throw fail("Invalid SVG path");
    const v = tokens.slice(i, (i += count)).map(Number);
    if (v.some((n) => !Number.isFinite(n))) throw fail("Invalid SVG path");
    const rel = command === lower;
    if (lower === "m") {
      move(
        pen,
        rel ? [pen.point[0] + v[0], pen.point[1] + v[1]] : [v[0], v[1]],
      );
      command = rel ? "l" : "L";
    } else if (!pen.line.length) throw fail("SVG path needs a moveto");
    else draw(pen, lower, v, rel);
  }
  if (pen.line.length > 1) pen.lines.push(pen.line);
  return pen.lines;
}

/** SVG permits adjacent one-character flags, followed immediately by x. */
function splitArcFlags(tokens: string[], start: number) {
  for (const offset of [3, 4]) {
    const index = start + offset,
      token = tokens[index];
    if (token?.length > 1 && /^[01]/.test(token))
      tokens.splice(index, 1, token[0], token.slice(1));
  }
}
