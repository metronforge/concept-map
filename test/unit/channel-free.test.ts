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
    nodes: { a: [0, 10, 10, 10], b: [40, 10, 10, 10] },
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
