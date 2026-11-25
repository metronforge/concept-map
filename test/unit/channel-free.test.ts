import { expect, it } from "vitest";
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
