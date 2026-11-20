const directions = ["right", "bottom", "left", "top"];
const same = (a, b) => a.every((v, i) => v === b[i]);

function axis(nodes, ends, dimension) {
  const bounds = nodes.flatMap(({ box }) => [
    box[dimension],
    box[dimension] + box[dimension + 2],
  ]);
  bounds.push(...ends.map((t) => t.point[dimension]));
  const sorted = [...new Set(bounds)].sort((a, b) => a - b);
  const channels = sorted.slice(1).map((n, i) => (n + sorted[i]) / 2);
  return [
    ...new Set([
      sorted[0] - 16,
      sorted.at(-1) + 16,
      ...channels,
      ...ends.map((t) => t.point[dimension]),
    ]),
  ].sort((a, b) => a - b);
}

function blocked(a, b, { id, box }, ends) {
  const along = a[0] === b[0] ? 1 : 0,
    across = 1 - along;
  if (a[across] < box[across] || a[across] > box[across] + box[across + 2])
    return false;
  const lo = Math.max(Math.min(a[along], b[along]), box[along]);
  const hi = Math.min(
    Math.max(a[along], b[along]),
    box[along] + box[along + 2],
  );
  if (lo > hi) return false;
  if (lo < hi) return true;
  const point = [...a];
  point[along] = lo;
  return !ends.some(
    (t) =>
      t.kind === "node" &&
      t.id === id &&
      same(t.point, point) &&
      (same(point, a) || same(point, b)),
  );
}

/** Channel midlines plus terminal projections; frame interiors are not obstacles. */
export function channelGrid(nodes, connection) {
  const ends = [connection.from, connection.to];
  const xs = axis(nodes, ends, 0),
    ys = axis(nodes, ends, 1);
  const points = ys.flatMap((y) => xs.map((x) => [x, y]));
  const index = (point) =>
    ys.indexOf(point[1]) * xs.length + xs.indexOf(point[0]);
  return {
    points,
    start: index(ends[0].point),
    goal: index(ends[1].point),
    neighbours: (at) => neighbours(at, xs.length, points, nodes, ends),
  };
}

function neighbours(at, width, points, nodes, ends) {
  const x = at % width;
  const indexes = [
    x + 1 < width ? at + 1 : -1,
    at + width,
    x > 0 ? at - 1 : -1,
    at - width,
  ];
  return indexes.flatMap((next, direction) => {
    if (next < 0 || next >= points.length) return [];
    const a = points[at],
      b = points[next];
    if (nodes.some((shape) => blocked(a, b, shape, ends))) return [];
    return [
      {
        next,
        direction,
        length: Math.abs(b[0] - a[0]) + Math.abs(b[1] - a[1]),
      },
    ];
  });
}

export function permits(terminal, direction) {
  return terminal.sides.includes(directions[direction]);
}
