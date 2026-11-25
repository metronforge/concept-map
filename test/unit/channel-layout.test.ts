import { expect, it } from "vitest";
import { routeLayout } from "../../src/layout/route/channel-layout.js";
import type { LayoutGraph, LayoutResult } from "../../src/layout/types.js";

it("routes selected arrows around boxes and preserves other geometry", () => {
  const graph: LayoutGraph = {
    nodes: [],
    lanes: [],
    edges: [{ id: "ab", from: "a", to: "b" }],
  };
  const original: LayoutResult = {
    nodes: { a: [0, 10, 10, 10], b: [40, 10, 10, 10], wall: [20, 5, 10, 20] },
    lanes: {},
    edges: {
      ab: {
        points: [
          [10, 15],
          [40, 15],
        ],
      },
    },
  };
  const routed = routeLayout(graph, original, original.nodes, [60, 40]);
  expect(routed?.edges.ab.points.some(([, y]) => y < 5 || y > 25)).toBe(true);
  expect(routed?.nodes).toEqual(original.nodes);
  expect(original.edges.ab.points).toEqual([
    [10, 15],
    [40, 15],
  ]);
});

it("rejects the candidate when a terminal is blocked", () => {
  const graph: LayoutGraph = {
    nodes: [],
    lanes: [],
    edges: [{ id: "ab", from: "a", to: "b" }],
  };
  const original: LayoutResult = {
    nodes: { a: [0, 10, 10, 10], b: [40, 10, 10, 10], wall: [10, 10, 10, 10] },
    lanes: {},
    edges: {
      ab: {
        points: [
          [10, 15],
          [40, 15],
        ],
      },
    },
  };
  expect(routeLayout(graph, original, original.nodes, [60, 40])).toBeNull();
});
