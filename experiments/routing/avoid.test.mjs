import assert from "node:assert/strict";
import { test } from "node:test";
import { loadAvoid, routeAvoid } from "./avoid.mjs";
import { routeIssues } from "./route-audit.mjs";
import { inputs } from "./inputs.mjs";
import { prepare } from "./prepare.mjs";

const terminal = (id, point, sides) => ({
  id,
  point,
  sides,
  kind: "node",
  gap: 0,
});
const fixture = () => ({
  nodes: [
    { id: "a", box: [0, 0, 10, 10] },
    { id: "b", box: [40, 0, 10, 10] },
  ],
  frames: [],
  edges: [
    {
      id: "ab",
      from: terminal("a", [10, 5], ["right"]),
      to: terminal("b", [40, 5], ["left"]),
    },
  ],
});

test("load WASM and preserve fixed ports on a straight route", async () => {
  const avoid = await loadAvoid();
  const problem = fixture();
  const [route] = routeAvoid(avoid, problem);
  assert.deepEqual(route.points, [
    [10, 5],
    [40, 5],
  ]);
  assert.deepEqual(routeIssues(problem, problem.edges[0], route), []);
});

test("route around a blocking box while retaining outward directions", async () => {
  const avoid = await loadAvoid();
  const problem = fixture();
  problem.nodes.push({ id: "wall", box: [20, -5, 10, 20] });
  const [route] = routeAvoid(avoid, problem);
  assert.ok(route.points.length >= 6);
  assert.deepEqual(routeIssues(problem, problem.edges[0], route), []);
});

test("audit rejects a false success that crosses a box or changes a port", () => {
  const problem = fixture();
  problem.nodes.push({ id: "wall", box: [20, -5, 10, 20] });
  const route = {
    id: "ab",
    points: [
      [10, 5],
      [40, 5],
    ],
  };
  assert.ok(
    routeIssues(problem, problem.edges[0], route).includes(
      "node contact: wall",
    ),
  );
  route.points[0] = [11, 5];
  assert.ok(
    routeIssues(problem, problem.edges[0], route).includes(
      "source port changed",
    ),
  );
});

test("route all fixture edges repeatedly without changing inputs", async () => {
  const avoid = await loadAvoid();
  let count = 0;
  for (const item of await inputs()) {
    const problem = prepare(item),
      before = structuredClone(problem);
    const routes = routeAvoid(avoid, problem);
    assert.deepEqual(routes, routeAvoid(avoid, problem), item.id);
    assert.deepEqual(problem, before);
    assert.deepEqual(
      routes.map((r) => r.id),
      problem.edges.map((e) => e.id),
    );
    for (const [i, route] of routes.entries()) {
      assert.equal(route.failure, undefined);
      assert.deepEqual(
        routeIssues(problem, problem.edges[i], route),
        [],
        `${item.id}/${route.id}`,
      );
    }
    count += routes.length;
  }
  assert.equal(count, 260);
});

test("retain the two-unit arrow gap between boxes six units apart", async () => {
  const avoid = await loadAvoid();
  const problem = fixture();
  problem.nodes = [
    { id: "a", box: [0, 0, 10, 10] },
    { id: "b", box: [0, 16, 10, 10] },
  ];
  problem.edges = [
    {
      id: "ab",
      from: terminal("a", [5, 10], ["bottom"]),
      to: { ...terminal("b", [5, 14], ["top"]), gap: 2 },
    },
  ];
  const [route] = routeAvoid(avoid, problem);
  assert.equal(route.failure, undefined);
  assert.deepEqual(route.points, [
    [5, 10],
    [5, 14],
  ]);
});

test("approach a gapped destination from its declared side", async () => {
  const avoid = await loadAvoid();
  const problem = fixture();
  problem.nodes[1].box = [0, 40, 10, 10];
  problem.edges = [
    {
      id: "ab",
      from: terminal("a", [10, 5], ["right"]),
      to: { ...terminal("b", [12, 45], ["right"]), gap: 2 },
    },
  ];
  const [route] = routeAvoid(avoid, problem);
  assert.equal(route.failure, undefined);
  assert.deepEqual(routeIssues(problem, problem.edges[0], route), []);
});
