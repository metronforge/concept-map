import { expect, it } from "vitest";
import { routeMoved } from "../../src/layout/route/channel-moved.js";
import type { LayoutGraph, LayoutResult } from "../../src/layout/types.js";

it("routes arrows of moved boxes and preserves untouched routes", () => {
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
      a: [0, 0, 10, 10],
      b: [40, 0, 10, 10],
      c: [0, 40, 10, 10],
      d: [40, 40, 10, 10],
    },
    lanes: {},
    edges: {
      ab: {
        points: [
          [10, 5],
          [40, 5],
        ],
      },
      cd: {
        points: [
          [10, 45],
          [25, 45],
          [40, 45],
        ],
      },
    },
  };
  const nodes = {
    ...original.nodes,
    a: [0, 10, 10, 10] as LayoutResult["nodes"][string],
  };
  const routed = routeMoved(graph, original, nodes, [60, 60]);
  expect(routed?.edges.ab.points[0]).toEqual([10, 15]);
  expect(routed?.edges.ab.points.at(-1)).toEqual([40, 5]);
  expect(routed?.edges.cd).toBe(original.edges.cd);
  expect(original.edges.ab.points[0]).toEqual([10, 5]);
});
