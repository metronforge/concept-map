import { expect, test } from "vitest";
import type { LayoutResult } from "../../../src/layout/types.js";
import type { Constraint } from "../../../src/layout/problem.js";
import { segmentRectGap } from "../../../src/layout/stages/plane.js";
import { rerouteMovedEdges } from "../../../src/layout/moved-routes.js";

type Side = Extract<Constraint, { kind: "side" }>["side"];
function movedPorts(
  original: LayoutResult,
  nodes: LayoutResult["nodes"],
  from: Side,
  to: Side,
) {
  return rerouteMovedEdges(
    {
      nodes: Object.entries(original.nodes).map(([id, box]) => ({
        id,
        width: box[2],
        height: box[3],
      })),
      edges: [{ id: "ab", from: "a", to: "b" }],
      lanes: [],
    },
    original,
    nodes,
    [
      {
        kind: "side",
        strength: "required",
        edge: "ab",
        end: "from",
        side: from,
      },
      { kind: "side", strength: "required", edge: "ab", end: "to", side: to },
    ],
  ).edges.ab;
}

test("opposed ports facing away go around both endpoint boxes", () => {
  const original: LayoutResult = {
    nodes: { a: [0, 0, 60, 36], b: [20, 100, 80, 36] },
    lanes: {},
    edges: {
      ab: {
        points: [
          [60, 18],
          [72, 18],
          [72, -12],
          [-12, -12],
          [-12, 118],
          [20, 118],
        ],
      },
    },
  };
  const nodes: LayoutResult["nodes"] = {
    ...original.nodes,
    b: [20, 120, 80, 36],
  };
  const route = movedPorts(original, nodes, "right", "left");
  expect(route.points[0]).toEqual([60, 18]);
  expect(route.points.at(-1)).toEqual([20, 138]);
  for (let i = 1; i < route.points.length; i++)
    for (const box of Object.values(nodes))
      expect(
        segmentRectGap(route.points[i - 1], route.points[i], box),
      ).toBeGreaterThanOrEqual(0);
});

test("fractional boxes do not reject ports displaced by arithmetic roundoff", () => {
  const original: LayoutResult = {
    nodes: { a: [0, 3 / 19, 60, 36.3], b: [300, 300, 60, 36] },
    lanes: {},
    edges: {
      ab: {
        points: [
          [30, 3 / 19 + 36.3],
          [30, 400],
          [330, 400],
          [330, 336],
        ],
      },
    },
  };
  const nodes: LayoutResult["nodes"] = {
    ...original.nodes,
    a: [0, 100.171875, 60, 36.3],
  };
  const route = movedPorts(original, nodes, "bottom", "bottom");
  expect(route.points[0][1]).toBeCloseTo(136.471875, 12);
  expect(route.points.at(-1)).toEqual([330, 336]);
});
