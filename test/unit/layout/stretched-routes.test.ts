import { expect, test } from "vitest";
import type { LayoutPoint, LayoutResult } from "../../../src/layout/types.js";
import { rerouteMovedEdges } from "../../../src/layout/moved-routes.js";

const bends: LayoutPoint[] = [
  [10, 20],
  [10, 30],
  [40, 30],
  [40, 100],
  [70, 100],
  [70, 120],
];

function stretch(points: LayoutPoint[], from: LayoutPoint, to: LayoutPoint) {
  const original: LayoutResult = {
    nodes: { a: [0, 0, 20, 20], b: [60, 120, 20, 20] },
    edges: { ab: { points } },
    lanes: {},
  };
  const before = structuredClone(original);
  const result = rerouteMovedEdges(
    {
      nodes: [
        { id: "a", width: 20, height: 20 },
        { id: "b", width: 20, height: 20 },
      ],
      edges: [{ id: "ab", from: "a", to: "b" }],
      lanes: [],
    },
    original,
    {
      a: [from[0], from[1], 20, 20],
      b: [60 + to[0], 120 + to[1], 20, 20],
    },
  );
  expect(original).toEqual(before);
  return result.edges.ab.points;
}

test("moving only the target lengthens the last segment, keeping earlier bends", () => {
  expect(stretch(bends, [0, 0], [0, 50])).toEqual([
    [10, 20],
    [10, 30],
    [40, 30],
    [40, 100],
    [70, 100],
    [70, 170],
  ]);
});

test("moving only the source stretches the first segment", () => {
  expect(stretch(bends, [0, 0.5], [0, 0])).toEqual([
    [10, 20.5],
    [10, 30],
    [40, 30],
    [40, 100],
    [70, 100],
    [70, 120],
  ]);
});

test("unequal shifts stretch the longest segment, keeping endpoint bends", () => {
  expect(stretch(bends, [0, 10], [0, 30])).toEqual([
    [10, 30],
    [10, 40],
    [40, 40],
    [40, 130],
    [70, 130],
    [70, 150],
  ]);
});

test("a target cross shift moves its last bend as well as its endpoint", () => {
  expect(stretch(bends, [0, 0], [15, 0])).toEqual([
    [10, 20],
    [10, 30],
    [40, 30],
    [40, 100],
    [85, 100],
    [85, 120],
  ]);
});

test("a source cross shift moves its first bend as well as its endpoint", () => {
  expect(stretch(bends, [5, 0], [0, 0])).toEqual([
    [15, 20],
    [15, 30],
    [40, 30],
    [40, 100],
    [70, 100],
    [70, 120],
  ]);
});

test("both axes stretch independently and equal axis shifts translate", () => {
  expect(stretch(bends, [7, 10], [7, 30])).toEqual([
    [17, 30],
    [17, 40],
    [47, 40],
    [47, 130],
    [77, 130],
    [77, 150],
  ]);
});

test("duplicate points at the target move with that endpoint", () => {
  expect(stretch([...bends, [70, 120]], [0, 0], [0, 50])).toEqual([
    [10, 20],
    [10, 30],
    [40, 30],
    [40, 100],
    [70, 100],
    [70, 170],
    [70, 170],
  ]);
});

test("diagonal engine segments keep their bends and translated endpoint", () => {
  expect(
    stretch(
      [
        [10, 20],
        [40, 50],
        [70, 120],
      ],
      [0, 0],
      [20, 50],
    ),
  ).toEqual([
    [10, 20],
    [40, 50],
    [90, 170],
  ]);
});

test("perpendicular target movement keeps duplicate endpoints together", () => {
  expect(
    stretch(
      [
        [10, 20],
        [10, 100],
        [10, 100],
      ],
      [0, 0],
      [15, 0],
    ),
  ).toEqual([
    [10, 20],
    [25, 100],
    [25, 100],
  ]);
});

test("perpendicular source movement keeps duplicate endpoints together", () => {
  expect(
    stretch(
      [
        [10, 20],
        [10, 20],
        [10, 100],
      ],
      [15, 0],
      [0, 0],
    ),
  ).toEqual([
    [25, 20],
    [25, 20],
    [10, 100],
  ]);
});

test("unequal perpendicular shifts keep duplicate endpoints together", () => {
  expect(
    stretch(
      [
        [10, 20],
        [10, 20],
        [10, 100],
        [10, 100],
      ],
      [5, 0],
      [15, 0],
    ),
  ).toEqual([
    [15, 20],
    [15, 20],
    [25, 100],
    [25, 100],
  ]);
});
