export type Point = [number, number];
/** Only endpoints are needed here; curve length and intermediate points use Geometry. */
export function pathEnds(path: string): [Point, Point] {
  const tokens =
    path.match(
      /[a-df-zA-DF-Z]|[-+]?(?:\d*\.\d+|\d+\.?\d*)(?:[eE][-+]?\d+)?/g,
    ) ?? [];
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
  let i = 0,
    command = "",
    point: Point = [0, 0],
    start: Point = [0, 0],
    first: Point | undefined;
  while (i < tokens.length) {
    if (/^[a-z]$/i.test(tokens[i])) command = tokens[i++];
    const lower = command.toLowerCase();
    if (lower === "z") {
      point = [...start];
      command = "";
      continue;
    }
    const count = arity[lower];
    if (!count || i + count > tokens.length || /^[a-z]$/i.test(tokens[i]))
      throw new Error(`Invalid SVG path: ${path}`);
    const values = tokens.slice(i, (i += count)).map(Number);
    if (values.some((n) => !Number.isFinite(n)))
      throw new Error(`Invalid SVG path: ${path}`);
    const relative = command === lower;
    if (lower === "h")
      point = [values[0] + (relative ? point[0] : 0), point[1]];
    else if (lower === "v")
      point = [point[0], values[0] + (relative ? point[1] : 0)];
    else
      point = [
        values[count - 2] + (relative ? point[0] : 0),
        values[count - 1] + (relative ? point[1] : 0),
      ];
    if (lower === "m") {
      start = [...point];
      first ??= [...point];
      command = relative ? "l" : "L";
    }
  }
  if (!first) throw new Error(`SVG path needs a moveto: ${path}`);
  return [first, point];
}
