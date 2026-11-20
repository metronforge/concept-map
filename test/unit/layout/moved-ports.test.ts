import { expect, test } from "vitest";
import type {
  LayoutGraph,
  LayoutPoint,
  LayoutResult,
} from "../../../src/layout/types.js";
import { segmentRectGap } from "../../../src/layout/stages/plane.js";
import { rerouteMovedEdges } from "../../../src/layout/moved-routes.js";

// Literal port positions and outward stubs on a 60 by 36 box at the origin.
const ports = {
  top: [
    [30, 0],
    [30, -12],
  ],
  right: [
    [60, 18],
    [72, 18],
  ],
  bottom: [
    [30, 36],
    [30, 48],
  ],
  left: [
    [0, 18],
    [-12, 18],
  ],
} satisfies Record<string, LayoutPoint[]>;
const sides = ["top", "right", "bottom", "left"] as const;

for (const from of sides)
  for (const to of sides)
    test(`${from} to ${to}: retain moved ports and orthogonal outward segments`, () => {
      const graph: LayoutGraph = {
        nodes: [
          { id: "a", width: 60, height: 36 },
          { id: "b", width: 60, height: 36 },
        ],
        edges: [{ id: "ab", from: "a", to: "b" }],
        lanes: [],
      };
      const start = ports[from][0],
        exit = ports[from][1];
      const end: LayoutPoint = [ports[to][0][0] + 300, ports[to][0][1] + 300];
      const entry: LayoutPoint = [ports[to][1][0] + 300, ports[to][1][1] + 300];
      const original: LayoutResult = {
        nodes: { a: [0, 0, 60, 36], b: [300, 300, 60, 36] },
        lanes: {},
        edges: {
          ab: {
            points: [start, start, exit, [exit[0], entry[1]], entry, end, end],
          },
        },
      };
      const nodes: LayoutResult["nodes"] = {
        a: [25, 50, 60, 36],
        b: [310, 320, 60, 36],
      };
      const result = rerouteMovedEdges(graph, original, nodes, [
        {
          kind: "side",
          strength: "required",
          edge: "ab",
          end: "from",
          side: from,
        },
        { kind: "side", strength: "required", edge: "ab", end: "to", side: to },
      ]);
      const route = result.edges.ab;
      expect(route.label).toBeUndefined();
      expect(route.points[0]).toEqual([start[0] + 25, start[1] + 50]);
      expect(route.points[1]).toEqual([exit[0] + 25, exit[1] + 50]);
      expect(route.points.at(-2)).toEqual([entry[0] + 10, entry[1] + 20]);
      expect(route.points.at(-1)).toEqual([end[0] + 10, end[1] + 20]);
      for (let i = 1; i < route.points.length; i++)
        for (const box of Object.values(nodes))
          expect(
            segmentRectGap(route.points[i - 1], route.points[i], box),
          ).toBeGreaterThanOrEqual(0);
      for (const [i, p] of route.points.entries())
        if (i)
          expect(
            p[0] === route.points[i - 1][0] || p[1] === route.points[i - 1][1],
          ).toBe(true);
    });

test("opposed ports facing away go around both endpoint boxes", () => {
  const graph: LayoutGraph = {
    nodes: [
      { id: "a", width: 60, height: 36 },
      { id: "b", width: 80, height: 36 },
    ],
    edges: [{ id: "ab", from: "a", to: "b" }],
    lanes: [],
  };
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
  const route = rerouteMovedEdges(graph, original, nodes, [
    {
      kind: "side",
      strength: "required",
      edge: "ab",
      end: "from",
      side: "right",
    },
    { kind: "side", strength: "required", edge: "ab", end: "to", side: "left" },
  ]).edges.ab;
  expect(route.points[0]).toEqual([60, 18]);
  expect(route.points.at(-1)).toEqual([20, 138]);
  for (let i = 1; i < route.points.length; i++)
    for (const box of Object.values(nodes))
      expect(
        segmentRectGap(route.points[i - 1], route.points[i], box),
      ).toBeGreaterThanOrEqual(0);
});

test("fractional boxes do not reject ports displaced by arithmetic roundoff", () => {
  const graph: LayoutGraph = {
    nodes: [
      { id: "a", width: 60, height: 36.3 },
      { id: "b", width: 60, height: 36 },
    ],
    edges: [{ id: "ab", from: "a", to: "b" }],
    lanes: [],
  };
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
  const route = rerouteMovedEdges(graph, original, nodes, [
    {
      kind: "side",
      strength: "required",
      edge: "ab",
      end: "from",
      side: "bottom",
    },
    {
      kind: "side",
      strength: "required",
      edge: "ab",
      end: "to",
      side: "bottom",
    },
  ]).edges.ab;
  expect(route.points[0][1]).toBeCloseTo(136.471875, 12);
  expect(route.points.at(-1)).toEqual([330, 336]);
});
