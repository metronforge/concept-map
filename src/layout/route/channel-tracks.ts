type Route = { id: string; points: number[][] };
type Run = {
  axis: number;
  coordinate: number;
  edge: string;
  segment: number;
  start: number;
  end: number;
  low: number | null;
  high: number | null;
};
type Group = {
  axis: number;
  coordinate: number;
  start: number;
  end: number;
  segments: Omit<Run, "axis" | "coordinate">[];
};

const compare = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

function corners(route: Route) {
  if (!route.points || route.points.length < 2)
    throw new Error(`Missing route: ${route.id}`);
  const result: number[][] = [];
  for (const point of route.points) {
    if (point.length !== 2 || !point.every(Number.isFinite))
      throw new Error(`Invalid point: ${route.id}`);
    const a = result.at(-2),
      b = result.at(-1);
    if (b && (point[0] === b[0]) === (point[1] === b[1]))
      throw new Error(`Expected nonzero orthogonal segment: ${route.id}`);
    if (
      a &&
      b &&
      [0, 1].some(
        (axis) =>
          a[axis] === b[axis] &&
          b[axis] === point[axis] &&
          (b[1 - axis] - a[1 - axis]) * (point[1 - axis] - b[1 - axis]) > 0,
      )
    )
      result.pop();
    result.push([...point]);
  }
  return result;
}

function segments(route: Route): Run[] {
  const points = corners(route);
  return points.slice(1).map((b, i) => {
    const a = points[i],
      axis = a[1] === b[1] ? 0 : 1;
    const forward = a[axis] < b[axis];
    const branch = (point: number[] | undefined) =>
      point ? Math.sign(point[1 - axis] - a[1 - axis]) : null;
    return {
      axis,
      coordinate: a[1 - axis],
      edge: route.id,
      segment: i,
      start: Math.min(a[axis], b[axis]),
      end: Math.max(a[axis], b[axis]),
      low: branch(points[forward ? i - 1 : i + 2]),
      high: branch(points[forward ? i + 2 : i - 1]),
    };
  });
}

/** Positive-length collinear overlap components; point contacts stay separate. */
export function sharedChannels(routes: readonly Route[]) {
  if (new Set(routes.map((route) => route.id)).size !== routes.length)
    throw new Error("Duplicate route id");
  const runs = routes
    .flatMap(segments)
    .sort(
      (a, b) =>
        a.axis - b.axis ||
        a.coordinate - b.coordinate ||
        a.start - b.start ||
        a.end - b.end ||
        compare(a.edge, b.edge) ||
        a.segment - b.segment,
    );
  const groups: Group[] = [];
  for (const { axis, coordinate, ...run } of runs) {
    let group = groups.at(-1);
    if (
      !group ||
      group.axis !== axis ||
      group.coordinate !== coordinate ||
      run.start >= group.end
    ) {
      group = {
        axis,
        coordinate,
        start: run.start,
        end: run.end,
        segments: [],
      };
      groups.push(group);
    }
    group.end = Math.max(group.end, run.end);
    group.segments.push(run);
  }
  return groups.filter((group) => group.segments.length > 1);
}
