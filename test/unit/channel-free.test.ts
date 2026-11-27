import { expect, it } from "vitest";
import { routeIssues } from "../../src/layout/route/route-audit.js";
import { routeFree } from "../../src/layout/route/channel-free.js";
import type { LayoutGraph, LayoutResult } from "../../src/layout/types.js";

it("routes omitted arrows using box positions and side hints", () => {
  const graph: LayoutGraph = {
    nodes: [],
    lanes: [],
    edges: [{ id: "ab", from: "a", to: "b" }],
  };
  const original: LayoutResult = {
    nodes: { a: [0, 10, 10, 10], b: [40, 10, 10, 10], wall: [20, 5, 10, 20] },
    lanes: {},
    edges: {},
  };
  const result = routeFree(
    graph,
    original,
    [60, 40],
    [
      {
        kind: "side",
        edge: "ab",
        end: "from",
        side: "top",
        strength: "required",
      },
    ],
  );
  expect(result?.edges.ab.points[0]).toEqual([5, 10]);
  expect(result?.edges.ab.points.at(-1)).toEqual([40, 15]);
  expect(
    routeIssues(
      {
        nodes: Object.entries(original.nodes).map(([id, box]) => ({ id, box })),
      },
      {
        id: "ab",
        from: { id: "a", kind: "node", point: [5, 10], sides: ["top"] },
        to: { id: "b", kind: "node", point: [40, 15], sides: ["left"] },
      },
      { points: result!.edges.ab.points },
    ),
  ).toEqual([]);
});

it("routes an omitted self-transition outside its box", () => {
  const graph: LayoutGraph = {
    nodes: [],
    lanes: [],
    edges: [{ id: "loop", from: "a", to: "a" }],
  };
  const original: LayoutResult = {
    nodes: { a: [10, 10, 10, 10], b: [30, 10, 10, 10] },
    lanes: {},
    edges: {},
  };
  const points = routeFree(graph, original, [50, 50], [])?.edges.loop.points;
  expect(points).toBeDefined();
  expect(points!.length).toBeGreaterThanOrEqual(4);
  const nodes = [
    { id: "a", box: original.nodes.a },
    { id: "b", box: original.nodes.b },
  ];
  const edge = {
    id: "loop",
    from: {
      id: "a",
      kind: "node" as const,
      point: [20, 15] as [number, number],
      sides: ["right" as const],
    },
    to: {
      id: "a",
      kind: "node" as const,
      point: [10, 15] as [number, number],
      sides: ["left" as const],
    },
  };
  expect(routeIssues({ nodes }, edge, { points: points! })).toEqual([]);
});

it("keeps omitted arrows apart when routing around the same obstacle", () => {
  const graph: LayoutGraph = {
    nodes: [],
    lanes: [],
    edges: [
      { id: "ab", from: "a", to: "b" },
      { id: "cd", from: "c", to: "d" },
    ],
  };
  const original: LayoutResult = {
    nodes: {
      a: [0, 30, 10, 10],
      b: [90, 30, 10, 10],
      c: [0, 50, 10, 10],
      d: [90, 50, 10, 10],
      wall: [40, 20, 20, 50],
    },
    lanes: {},
    edges: {},
  };
  const result = routeFree(graph, original, [100, 100], []);
  expect(result).not.toBeNull();
  const segments = (points: number[][]) =>
    points.slice(1).map((end, i) => [points[i], end]);
  for (const [a, b] of segments(result!.edges.ab.points)) {
    for (const [c, d] of segments(result!.edges.cd.points)) {
      const axis = a[0] === b[0] ? 1 : 0;
      const across = 1 - axis;
      if (c[across] !== d[across] || a[across] !== c[across]) continue;
      const overlap =
        Math.min(Math.max(a[axis], b[axis]), Math.max(c[axis], d[axis])) -
        Math.max(Math.min(a[axis], b[axis]), Math.min(c[axis], d[axis]));
      expect(overlap).toBeLessThanOrEqual(1 / 64);
    }
  }
});

it("adds an omitted labeled arrow without changing engine geometry", () => {
  const graph: LayoutGraph = {
    nodes: [],
    lanes: [],
    edges: [
      { id: "return", from: "b", to: "a", label: { width: 8, height: 4 } },
    ],
  };
  const original: LayoutResult = {
    nodes: { a: [0, 10, 10, 10], b: [40, 10, 10, 10] },
    lanes: { lane: [0, 0, 50, 30] },
    edges: {
      forward: {
        points: [
          [10, 15],
          [40, 15],
        ],
        label: [25, 12],
      },
    },
  };
  const before = structuredClone(original);
  const result = routeFree(graph, original, [60, 40], []);

  expect(result).not.toBeNull();
  expect(result!.edges.return.points.length).toBeGreaterThanOrEqual(2);
  expect(result!.edges.return.label).toHaveLength(2);
  expect(result!.edges.forward).toEqual(before.edges.forward);
  expect(result!.nodes).toEqual(before.nodes);
  expect(result!.lanes).toEqual(before.lanes);
  expect(original).toEqual(before);
});
