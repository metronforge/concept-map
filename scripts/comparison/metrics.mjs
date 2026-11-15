import { labelOverlaps } from "./overlaps.mjs";
const EPS = 1e-7;
const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
const cross = (a, b) => a[0] * b[1] - a[1] * b[0];
const same = (a, b) => Math.hypot(...sub(a, b)) < EPS;

/** All current book and adapter paths are polylines; fail rather than approximate curves. */
export function polyline(path) {
  const tokens =
    path.match(
      /[a-df-zA-DF-Z]|[-+]?(?:\d*\.\d+|\d+\.?\d*)(?:[eE][-+]?\d+)?/g,
    ) ?? [];
  let i = 0,
    command = "",
    current = [0, 0];
  const points = [];
  while (i < tokens.length) {
    if (/^[A-Za-z]$/.test(tokens[i])) command = tokens[i++];
    if (!["M", "L", "H", "V"].includes(command))
      throw new Error(`Unsupported path command: ${command}`);
    const count = command === "M" || command === "L" ? 2 : 1;
    const values = tokens.slice(i, (i += count)).map(Number);
    if (values.length !== count || values.some((v) => !Number.isFinite(v)))
      throw new Error(`Invalid polyline: ${path}`);
    if (!points.length && command !== "M")
      throw new Error("Polyline must start with M");
    if (command === "M" && points.length)
      throw new Error("Multiple subpaths are not supported");
    current =
      command === "H"
        ? [values[0], current[1]]
        : command === "V"
          ? [current[0], values[0]]
          : values;
    if (!points.length || !same(points.at(-1), current)) points.push(current);
    if (command === "M") command = "L";
  }
  if (points.length < 2) throw new Error(`Polyline has no segment: ${path}`);
  return points;
}
function intersection(a, b, c, d) {
  const r = sub(b, a),
    s = sub(d, c),
    den = cross(r, s);
  if (Math.abs(den) < EPS) return undefined; // Collinear overlap is not a crossing.
  const t = cross(sub(c, a), s) / den,
    u = cross(sub(c, a), r) / den;
  if (t < -EPS || t > 1 + EPS || u < -EPS || u > 1 + EPS) return undefined;
  return [a[0] + t * r[0], a[1] + t * r[1]];
}
function rays(path, p) {
  if (same(path[0], p) || same(path.at(-1), p)) return undefined;
  const vertex = path.findIndex((v) => same(v, p));
  if (vertex > 0) return [sub(path[vertex - 1], p), sub(path[vertex + 1], p)];
  for (let i = 1; i < path.length; i++) {
    const a = sub(path[i - 1], p),
      b = sub(path[i], p);
    if (Math.abs(cross(a, b)) < EPS && a[0] * b[0] + a[1] * b[1] < 0)
      return [a, b];
  }
}
function crossesAt(a, b, point) {
  const ar = rays(a, point),
    br = rays(b, point);
  if (!ar || !br) return false;
  const directions = [
    ...ar.map((v) => ({ v, id: 0 })),
    ...br.map((v) => ({ v, id: 1 })),
  ]
    .map(({ v, id }) => ({ angle: Math.atan2(v[1], v[0]), id }))
    .sort((a, b) => a.angle - b.angle);
  return directions.every((d, i) => {
    const next = directions[(i + 1) % 4];
    const angle = (next.angle - d.angle + 2 * Math.PI) % (2 * Math.PI);
    return d.id !== next.id && angle > EPS;
  });
}
function crossings(a, b) {
  const found = [];
  for (let i = 1; i < a.length; i++)
    for (let j = 1; j < b.length; j++) {
      const p = intersection(a[i - 1], a[i], b[j - 1], b[j]);
      if (p && !found.some((q) => same(p, q)) && crossesAt(a, b, p))
        found.push(p);
    }
  return found.length;
}
export function geometryMetrics(map) {
  const paths = Object.values(map.edges).map((e) => polyline(e.path));
  let crossingCount = 0,
    bends = 0;
  for (let i = 0; i < paths.length; i++) {
    for (let j = i + 1; j < paths.length; j++)
      crossingCount += crossings(paths[i], paths[j]);
    const p = paths[i];
    for (let k = 1; k < p.length - 1; k++) {
      const a = sub(p[k], p[k - 1]),
        b = sub(p[k + 1], p[k]);
      if (Math.abs(cross(a, b)) > EPS || a[0] * b[0] + a[1] * b[1] < 0) bends++;
    }
  }
  return {
    ...labelOverlaps(map),
    crossings: crossingCount,
    bends,
    area: map.viewBox[0] * map.viewBox[1],
    width: map.viewBox[0],
    height: map.viewBox[1],
  };
}
