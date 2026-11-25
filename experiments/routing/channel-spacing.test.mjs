import assert from "node:assert/strict";
import { test } from "node:test";
import * as spacing from "./channel-spacing.mjs";
import { routeIssues } from "./route-audit.mjs";
import { crossings } from "../../dist/layout/stages/plane.js";
import { overlapAudit } from "./overlap.mjs";

const routes = (conflict = false) => [
  {
    id: "a",
    points: [
      [10, 10],
      [20, 10],
      [20, 50],
      [80, 50],
      [80, conflict ? 90 : 10],
      [90, conflict ? 90 : 10],
    ],
  },
  {
    id: "b",
    points: [
      [10, 90],
      [30, 90],
      [30, 50],
      [70, 50],
      [70, conflict ? 10 : 90],
      [90, conflict ? 10 : 90],
    ],
  },
];
const problem = (paths, nodes = []) => ({
  viewBox: [100, 100],
  nodes,
  frames: [],
  edges: paths.map(({ id, points }) => ({
    id,
    from: {
      id: `${id}-from`,
      kind: "frame",
      point: points[0],
      sides: ["right"],
    },
    to: {
      id: `${id}-to`,
      kind: "frame",
      point: points.at(-1),
      sides: ["left"],
    },
  })),
});
const shared = (paths) =>
  overlapAudit(
    paths.map(({ id, points }) => ({
      id,
      path: `M${points.map((p) => p.join(" ")).join(" L")}`,
    })),
  ).sharedLength;
const run = (input, paths) => {
  assert.equal(typeof spacing.spaceChannels, "function");
  return spacing.spaceChannels(input, paths);
};

test("separates ordered shared runs while preserving ports and approach sides", () => {
  const paths = routes(),
    input = problem(paths),
    before = structuredClone({ paths, input });
  const result = run(input, paths);
  assert.equal(shared(paths), 40);
  assert.equal(shared(result), 0);
  assert.ok(result[0].points[2][1] < result[1].points[2][1]);
  result.forEach((route, i) =>
    assert.deepEqual(routeIssues(input, input.edges[i], route), []),
  );
  assert.deepEqual({ paths, input }, before);
});

test("assigns distinct tracks when the two joins require opposite orders", () => {
  const paths = routes(true),
    input = problem(paths);
  const result = run(input, paths);
  assert.equal(shared(result), 0);
  assert.equal(crossings(result[0].points, result[1].points).length, 1);
  result.forEach((route, i) =>
    assert.deepEqual(routeIssues(input, input.edges[i], route), []),
  );
});

test("fits tracks between nearby closed boxes without leaving the viewport", () => {
  const paths = routes();
  const input = problem(paths, [
    { id: "upper", box: [35, 0, 30, 49] },
    { id: "lower", box: [35, 51, 30, 49] },
  ]);
  const result = run(input, paths);
  assert.equal(shared(result), 0);
  for (const [i, route] of result.entries()) {
    assert.deepEqual(routeIssues(input, input.edges[i], route), []);
    assert.ok(
      route.points.every(([x, y]) => x >= 0 && y >= 0 && x <= 100 && y <= 100),
    );
  }
});

test("coupled tracks meet through a shared bend without crossing", () => {
  const paths = [
    {
      id: "a",
      points: [
        [10, 10],
        [20, 10],
        [20, 50],
        [60, 50],
        [60, 90],
        [90, 90],
      ],
    },
    {
      id: "b",
      points: [
        [25, 20],
        [30, 20],
        [30, 50],
        [60, 50],
        [60, 80],
        [90, 80],
      ],
    },
  ];
  const input = problem(paths),
    result = run(input, paths);
  assert.equal(shared(result), 0);
  assert.equal(crossings(result[0].points, result[1].points).length, 0);
  result.forEach((route, i) =>
    assert.deepEqual(routeIssues(input, input.edges[i], route), []),
  );
});

test("keeps coincident terminal runs fixed instead of moving their ports", () => {
  const paths = routes();
  paths[1].points[0] = [...paths[0].points[0]];
  paths[1].points[1] = [...paths[0].points[1]];
  paths[1].points[2] = [...paths[0].points[2]];
  const input = problem(paths),
    result = run(input, paths);
  result.forEach((route, i) =>
    assert.deepEqual(routeIssues(input, input.edges[i], route), []),
  );
  assert.deepEqual(result[0].points[0], paths[0].points[0]);
  assert.deepEqual(result[1].points[0], paths[1].points[0]);
});

test("refuses a spacing assignment that reverses a short leg", () => {
  const paths = routes();
  paths[0].points[0][1] = paths[0].points[1][1] = 49;
  const input = problem(paths);
  const result = run(input, paths);
  assert.deepEqual(result, paths);
  result.forEach((route, i) =>
    assert.deepEqual(routeIssues(input, input.edges[i], route), []),
  );
});
