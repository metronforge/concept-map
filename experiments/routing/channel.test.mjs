import assert from "node:assert/strict";
import { test } from "node:test";
import { routeChannel } from "./channel.mjs";
import { inputs } from "./inputs.mjs";
import { prepare } from "./prepare.mjs";

const end = (id, point, sides) => ({ id, point, sides, kind: "node", gap: 0 });
const edge = (from, to) => ({ id: "ab", from, to });
const fixture = (connection, extra = []) => ({
  nodes: [
    { id: "a", box: [0, 0, 10, 10] },
    { id: "b", box: [40, 0, 10, 10] },
    ...extra,
  ],
  frames: [],
  edges: [connection],
});
const straight = () =>
  edge(end("a", [10, 5], ["right"]), end("b", [40, 5], ["left"]));

test("choose a straight route when the ports face one another", () => {
  assert.deepEqual(routeChannel(fixture(straight())), [
    {
      id: "ab",
      points: [
        [10, 5],
        [40, 5],
      ],
    },
  ]);
});

test("detour around a blocking box without entering or touching it", () => {
  const problem = fixture(straight(), [{ id: "wall", box: [20, -5, 10, 20] }]);
  const [route] = routeChannel(problem);
  assert.ok(route.points.length >= 6);
  assert.ok(route.points.some(([, y]) => y < -5 || y > 15));
  verifyRoute(problem, problem.edges[0], route);
});

test("honour outward sides even when they require a longer route", () => {
  const problem = fixture(
    edge(end("a", [5, 0], ["top"]), end("b", [45, 10], ["bottom"])),
  );
  const [route] = routeChannel(problem);
  assert.ok(route.points[1][1] < 0);
  assert.ok(route.points.at(-2)[1] > 10);
  verifyRoute(problem, problem.edges[0], route);
});

test("same-port self-loops have nonzero width and height", () => {
  const terminal = end("a", [10, 5], ["right"]);
  const problem = fixture(edge(terminal, terminal));
  const [route] = routeChannel(problem);
  assert.ok(route.points.length >= 5);
  assert.ok(new Set(route.points.map((p) => p[0])).size > 1);
  assert.ok(new Set(route.points.map((p) => p[1])).size > 1);
  verifyRoute(problem, problem.edges[0], route);
});

test("report a blocked port instead of inventing a route through a box", () => {
  const problem = fixture(straight(), [{ id: "wall", box: [10, 0, 10, 10] }]);
  assert.deepEqual(routeChannel(problem), [
    { id: "ab", failure: "no channel path" },
  ]);
});

function outward(a, b) {
  if (a[0] === b[0]) return b[1] < a[1] ? "top" : "bottom";
  return b[0] < a[0] ? "left" : "right";
}

// Independent interval intersection, including boundary contact, for axis-aligned lines.
function contacts(a, b, [x, y, w, h]) {
  const low = [
    Math.max(Math.min(a[0], b[0]), x),
    Math.max(Math.min(a[1], b[1]), y),
  ];
  const high = [
    Math.min(Math.max(a[0], b[0]), x + w),
    Math.min(Math.max(a[1], b[1]), y + h),
  ];
  return low.every((v, i) => v <= high[i]) ? { low, high } : null;
}

function verifyRoute(problem, connection, route) {
  assert.ok(!route.failure, connection.id);
  const points = route.points;
  assert.deepEqual(points[0], connection.from.point);
  assert.deepEqual(points.at(-1), connection.to.point);
  assert.ok(connection.from.sides.includes(outward(points[0], points[1])));
  assert.ok(
    connection.to.sides.includes(outward(points.at(-1), points.at(-2))),
  );
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1],
      b = points[i];
    assert.notDeepEqual(a, b);
    assert.ok(a[0] === b[0] || a[1] === b[1]);
    for (const shape of problem.nodes) {
      const hit = contacts(a, b, shape.box);
      if (!hit) continue;
      assert.deepEqual(hit.low, hit.high, `line enters ${shape.id}`);
      const permitted = [connection.from, connection.to].some(
        (t) =>
          t.kind === "node" &&
          t.id === shape.id &&
          t.point.every((v, j) => v === hit.low[j]),
      );
      assert.ok(permitted, `line touches ${shape.id}`);
    }
  }
}

test("route every fixture edge deterministically without changing boxes or ports", async () => {
  let count = 0;
  for (const item of await inputs()) {
    const problem = prepare(item),
      before = structuredClone(problem);
    const routes = routeChannel(problem);
    assert.deepEqual(routes, routeChannel(problem));
    assert.deepEqual(problem, before);
    assert.equal(routes.length, problem.edges.length);
    routes.forEach((route, i) => verifyRoute(problem, problem.edges[i], route));
    count += routes.length;
  }
  assert.equal(count, 260);
});
