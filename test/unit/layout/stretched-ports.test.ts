import { expect, test } from "vitest";
import type {
  LayoutGraph,
  LayoutPoint,
  LayoutResult,
} from "../../../src/layout/types.js";
import { rerouteMovedEdges } from "../../../src/layout/moved-routes.js";
import { segmentRectGap } from "../../../src/layout/stages/plane.js";

const points: LayoutPoint[] = [
  [60, 18],
  [80, 18],
  [80, 60],
  [140, 60],
  [140, 118],
  [160, 118],
];
const graph: LayoutGraph = {
  nodes: [
    { id: "a", width: 60, height: 36 },
    { id: "b", width: 60, height: 36 },
  ],
  edges: [{ id: "ab", from: "a", to: "b" }],
  lanes: [],
};
const cases: {
  name: string;
  from: LayoutPoint;
  to: LayoutPoint;
  want: LayoutPoint[];
}[] = [
  {
    name: "target rank shift",
    from: [0, 0],
    to: [0, 50],
    want: [
      [60, 18],
      [80, 18],
      [80, 60],
      [140, 60],
      [140, 168],
      [160, 168],
    ],
  },
  {
    name: "source rank shift",
    from: [0, 10],
    to: [0, 0],
    want: [
      [60, 28],
      [80, 28],
      [80, 60],
      [140, 60],
      [140, 118],
      [160, 118],
    ],
  },
  {
    name: "unequal rank shifts",
    from: [0, 10],
    to: [0, 30],
    want: [
      [60, 28],
      [80, 28],
      [80, 70],
      [140, 70],
      [140, 148],
      [160, 148],
    ],
  },
  {
    name: "target cross shift",
    from: [0, 0],
    to: [15, 0],
    want: [
      [60, 18],
      [80, 18],
      [80, 60],
      [140, 60],
      [140, 118],
      [175, 118],
    ],
  },
  {
    name: "source cross shift",
    from: [5, 0],
    to: [0, 0],
    want: [
      [65, 18],
      [80, 18],
      [80, 60],
      [140, 60],
      [140, 118],
      [160, 118],
    ],
  },
  {
    name: "unequal shifts on both axes",
    from: [5, 10],
    to: [15, 30],
    want: [
      [65, 28],
      [85, 28],
      [85, 70],
      [155, 70],
      [155, 148],
      [175, 148],
    ],
  },
];

for (const { name, from, to, want } of cases)
  test(`side hints preserve bends after a ${name}`, () => {
    const original: LayoutResult = {
      nodes: { a: [0, 0, 60, 36], b: [160, 100, 60, 36] },
      edges: { ab: { points } },
      lanes: {},
    };
    const before = structuredClone(original);
    const nodes: LayoutResult["nodes"] = {
      a: [from[0], from[1], 60, 36],
      b: [160 + to[0], 100 + to[1], 60, 36],
    };
    const result = rerouteMovedEdges(graph, original, nodes, [
      {
        kind: "side",
        strength: "required",
        edge: "ab",
        end: "from",
        side: "right",
      },
      {
        kind: "side",
        strength: "required",
        edge: "ab",
        end: "to",
        side: "left",
      },
    ]);
    expect(result.edges.ab.points).toEqual(want);
    for (const [i, point] of want.entries())
      if (i)
        for (const box of Object.values(nodes))
          expect(
            segmentRectGap(want[i - 1], point, box),
          ).toBeGreaterThanOrEqual(0);
    expect(original).toEqual(before);
  });
