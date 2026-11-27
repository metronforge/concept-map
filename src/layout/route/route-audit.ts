type Terminal = {
  id: string;
  kind: "node" | "frame";
  point: number[];
  sides: readonly string[];
};
type Edge = { from: Terminal; to: Terminal };
type Shape = { id: string; box: number[] };
const same = (a: readonly number[], b: readonly number[]) =>
  a.every((v, i) => v === b[i]);

function outward(a: number[], b: number[]) {
  if (a[0] === b[0]) return b[1] < a[1] ? "top" : "bottom";
  return b[0] < a[0] ? "left" : "right";
}

// Independent closed-rectangle intersection, not a router's success flag.
function unwantedContact(a: number[], b: number[], shape: Shape, edge: Edge) {
  const [x, y, w, h] = shape.box;
  const low = [
    Math.max(Math.min(a[0], b[0]), x),
    Math.max(Math.min(a[1], b[1]), y),
  ];
  const high = [
    Math.min(Math.max(a[0], b[0]), x + w),
    Math.min(Math.max(a[1], b[1]), y + h),
  ];
  if (low.some((v, i) => v > high[i])) return false;
  return (
    !same(low, high) ||
    ![edge.from, edge.to].some(
      (t) => t.kind === "node" && t.id === shape.id && same(t.point, low),
    )
  );
}

/** Exact port, direction and box audit shared by candidate geometry reports. */
export function routeIssues(
  problem: { nodes: readonly Shape[] },
  edge: Edge,
  route: { points: number[][] },
) {
  const points = route.points;
  if (!points || points.length < 2) return ["missing route"];
  if (points.some((p) => p.length !== 2 || p.some((v) => !Number.isFinite(v))))
    return ["invalid point"];
  const issues: string[] = [];
  if (!same(points[0], edge.from.point)) issues.push("source port changed");
  if (!same(points.at(-1)!, edge.to.point))
    issues.push("destination port changed");
  if (!edge.from.sides.includes(outward(points[0], points[1])))
    issues.push("source side changed");
  if (!edge.to.sides.includes(outward(points.at(-1)!, points.at(-2)!)))
    issues.push("destination side changed");
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1],
      b = points[i];
    if (same(a, b)) issues.push("zero-length segment");
    if (a[0] !== b[0] && a[1] !== b[1]) issues.push("non-orthogonal segment");
    for (const shape of problem.nodes)
      if (unwantedContact(a, b, shape, edge))
        issues.push(`node contact: ${shape.id}`);
  }
  return [...new Set(issues)];
}
