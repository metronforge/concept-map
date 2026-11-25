import { expect, it } from "vitest";
import { routeIssues } from "../../src/layout/route/route-audit.js";

const edge = {
  from: { id: "a", kind: "node" as const, point: [10, 5], sides: ["right"] },
  to: { id: "b", kind: "node" as const, point: [40, 5], sides: ["left"] },
};
const problem = {
  nodes: [
    { id: "a", box: [0, 0, 10, 10] },
    { id: "b", box: [40, 0, 10, 10] },
    { id: "obstacle", box: [20, 0, 10, 10] },
  ],
};

it("accepts port contact but detects a route crossing another box", () => {
  expect(
    routeIssues(problem, edge, {
      points: [
        [10, 5],
        [40, 5],
      ],
    }),
  ).toEqual(["node contact: obstacle"]);
  expect(
    routeIssues(problem, edge, {
      points: [
        [10, 5],
        [15, 5],
        [15, 15],
        [35, 15],
        [35, 5],
        [40, 5],
      ],
    }),
  ).toEqual([]);
});
