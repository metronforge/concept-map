import { expect, it } from "vitest";
import { routeIssues } from "../../src/layout/route/route-audit.js";
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

it("rejects a terminal that does not face a box side", () => {
  const graph: LayoutGraph = {
    nodes: [],
    lanes: [],
    edges: [{ id: "ab", from: "a", to: "b" }],
  };
  const original: LayoutResult = {
    nodes: { a: [0, 0, 10, 10], b: [30, 0, 10, 10] },
    lanes: {},
    edges: {
      ab: {
        points: [
          [5, 5],
          [30, 5],
        ],
      },
    },
  };
  expect(routeLayout(graph, original, original.nodes, [50, 20])).toBeNull();
});

it("routes an arrow omitted from placement using selected attachment sides", () => {
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
  const routed = routeLayout(graph, original, original.nodes, [60, 40], {
    ab: { from: "right", to: "left" },
  });
  expect(routed?.edges.ab.points[0]).toEqual([10, 15]);
  expect(routed?.edges.ab.points.at(-1)).toEqual([40, 15]);
  expect(routed?.edges.ab.points.some(([, y]) => y < 5 || y > 25)).toBe(true);
  expect(original.edges).toEqual({});
});

it("routes between moved boxes while preserving translated ports", () => {
  const graph: LayoutGraph = {
    nodes: [],
    lanes: [],
    edges: [{ id: "ab", from: "a", to: "b" }],
  };
  const original: LayoutResult = {
    nodes: { a: [0, 0, 10, 10], b: [40, 0, 10, 10] },
    lanes: {},
    edges: {
      ab: {
        points: [
          [10, 5],
          [40, 5],
        ],
      },
    },
  };
  const nodes: LayoutResult["nodes"] = {
    a: [0, 20, 10, 10],
    b: [40, 10, 10, 10],
    wall: [20, 10, 10, 20],
  };
  const routed = routeLayout(graph, original, nodes, [60, 50]);
  expect(routed).not.toBeNull();
  const points = routed!.edges.ab.points;
  expect(
    routeIssues(
      { nodes: Object.entries(nodes).map(([id, box]) => ({ id, box })) },
      {
        id: "ab",
        from: { id: "a", kind: "node", point: [10, 25], sides: ["right"] },
        to: { id: "b", kind: "node", point: [40, 15], sides: ["left"] },
      },
      { points },
    ),
  ).toEqual([]);
  expect(original.edges.ab.points).toEqual([
    [10, 5],
    [40, 5],
  ]);
});
