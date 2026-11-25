import { spacingOrders } from "./channel-spacing-order.js";
import { routeIssues } from "./route-audit.js";

type Route = { id: string; points: number[][] };
type Group = ReturnType<typeof spacingOrders>[number];
type Problem = {
  viewBox: number[];
  nodes: { id: string; box: number[] }[];
  edges: {
    id: string;
    from: {
      id: string;
      kind: "node" | "frame";
      point: number[];
      sides: readonly string[];
    };
    to: {
      id: string;
      kind: "node" | "frame";
      point: number[];
      sides: readonly string[];
    };
  }[];
};

function corridor(problem: Problem, group: Group) {
  const axis = group.axis,
    across = 1 - axis;
  let low = 0,
    high = problem.viewBox[across];
  for (const { box } of problem.nodes) {
    if (box[axis] > group.end || box[axis] + box[axis + 2] < group.start)
      continue;
    const from = box[across],
      to = from + box[across + 2];
    if (to <= group.coordinate) low = Math.max(low, to);
    if (from >= group.coordinate) high = Math.min(high, from);
  }
  return [(low + group.coordinate) / 2, (high + group.coordinate) / 2];
}

function positions(problem: Problem, group: Group, routes: Route[]) {
  const pins = group.order.flatMap((index, rank) => {
    const run = group.segments[index];
    const route = routes.find((r) => r.id === run.edge)!;
    return run.segment === 0 || run.segment === route.points.length - 2
      ? [rank]
      : [];
  });
  if (pins.length > 1) return group.order.map(() => group.coordinate);
  const middle = pins[0] ?? (group.order.length - 1) / 2;
  const [low, high] = corridor(problem, group);
  const below = group.order.length - 1 - middle;
  const gap = Math.max(
    0,
    Math.min(
      4,
      middle ? (group.coordinate - low) / middle : Infinity,
      below ? (high - group.coordinate) / below : Infinity,
    ),
  );
  return group.order.map((_, rank) => group.coordinate + (rank - middle) * gap);
}

function shifted(route: Route, changes: [number, number, number][]) {
  const points = route.points.map((p) => [...p]);
  for (const [segment, across, value] of changes) {
    points[segment][across] = value;
    points[segment + 1][across] = value;
  }
  return { id: route.id, points };
}

function valid(problem: Problem, before: Route[], after: Route[]) {
  return after.every((route, index) => {
    const edge = problem.edges.find((e) => e.id === route.id)!;
    if (routeIssues(problem, edge, route).length) return false;
    if (
      route.points.some((p) =>
        p.some((v, axis) => v < 0 || v > problem.viewBox[axis]),
      )
    )
      return false;
    return route.points.slice(1).every((b, i) => {
      const a = route.points[i],
        old = before[index].points;
      const axis = old[i][0] === old[i + 1][0] ? 1 : 0;
      return (b[axis] - a[axis]) * (old[i + 1][axis] - old[i][axis]) > 0;
    });
  });
}

/** Assign all shared-run coordinates together; preserve terminal supporting lines. */
export function spaceChannels(problem: Problem, routes: Route[]) {
  const changes = new Map<string, [number, number, number][]>(
    routes.map((route) => [route.id, []]),
  );
  for (const group of spacingOrders(routes)) {
    const values = positions(problem, group, routes);
    for (const [rank, index] of group.order.entries()) {
      const run = group.segments[index];
      changes.get(run.edge)!.push([run.segment, 1 - group.axis, values[rank]]);
    }
  }
  const result = routes.map((route) => shifted(route, changes.get(route.id)!));
  return valid(problem, routes, result)
    ? result
    : routes.map((route) => ({
        ...route,
        points: route.points.map((point) => [...point]),
      }));
}
