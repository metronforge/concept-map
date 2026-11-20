import { expect, test } from "vitest";
import type { LayoutGraph, LayoutResult } from "../../../src/layout/types.js";
import { rerouteMovedEdges } from "../../../src/layout/moved-routes.js";

function fixture() {
  const graph: LayoutGraph = {
    nodes: ["a", "b", "c"].map((id) => ({ id, width: 60, height: 36 })),
    edges: [
      { id: "ab", from: "a", to: "b", label: { width: 20, height: 12 } },
      { id: "bc", from: "b", to: "c" },
      { id: "loop", from: "a", to: "a", label: { width: 20, height: 12 } },
    ],
    lanes: [],
  };
  const result: LayoutResult = {
    nodes: { a: [0, 0, 60, 36], b: [120, 100, 60, 36], c: [120, 200, 60, 36] },
    edges: {
      ab: {
        points: [
          [30, 36],
          [30, 68],
          [150, 68],
          [150, 100],
        ],
        label: [90, 50],
      },
      bc: {
        points: [
          [150, 136],
          [150, 200],
        ],
      },
      loop: {
        points: [
          [60, 9],
          [84, 9],
          [84, 27],
          [60, 27],
        ],
        label: [106, 18],
      },
    },
    lanes: {},
  };
  return { graph, result };
}

test("no moved boxes keeps the exact result, even with cloned boxes", () => {
  const { graph, result } = fixture();
  expect(rerouteMovedEdges(graph, result, structuredClone(result.nodes))).toBe(
    result,
  );
});

test("only arrows incident to a moved box are rerouted without mutating inputs", () => {
  const { graph, result } = fixture();
  const nodes = {
    ...result.nodes,
    a: [0, 100, 60, 36] as [number, number, number, number],
  };
  const before = structuredClone({ graph, result, nodes });
  const routed = rerouteMovedEdges(graph, result, nodes);
  expect(routed.nodes).toEqual(nodes);
  expect(routed.edges.bc).toBe(result.edges.bc);
  expect(routed.edges.ab.points[0]).toEqual([60, 118]);
  expect(routed.edges.ab.points.at(-1)).toEqual([120, 118]);
  expect(routed.edges.ab.label).not.toEqual(result.edges.ab.label);
  // The right loop would touch b after moving; the existing chooser uses the left.
  expect(routed.edges.loop.points[0]).toEqual([0, 109]);
  expect(routed.edges.loop.label).toEqual([-46, 118]);
  expect({ graph, result, nodes }).toEqual(before);
});

test("equal endpoint displacement translates every route point and its label", () => {
  const { graph, result } = fixture();
  const nodes = structuredClone(result.nodes);
  for (const box of Object.values(nodes)) {
    box[0] += 17;
    box[1] += 31;
  }
  const routed = rerouteMovedEdges(graph, result, nodes);
  expect(routed.edges.ab).toEqual({
    points: [
      [47, 67],
      [47, 99],
      [167, 99],
      [167, 131],
    ],
    label: [107, 81],
  });
  expect(routed.edges.bc.points).toEqual([
    [167, 167],
    [167, 231],
  ]);
});

test("a moved hinted self-loop keeps its original port sides", () => {
  const { graph, result } = fixture();
  result.edges.loop = {
    points: [
      [60, 18],
      [80, 18],
      [80, -20],
      [30, -20],
      [30, 0],
    ],
  };
  const nodes = structuredClone(result.nodes);
  nodes.a[1] += 100;
  const routed = rerouteMovedEdges(graph, result, nodes, [
    {
      kind: "side",
      strength: "required",
      edge: "loop",
      end: "from",
      side: "right",
    },
    {
      kind: "side",
      strength: "required",
      edge: "loop",
      end: "to",
      side: "top",
    },
  ]);
  expect(routed.edges.loop.points).toEqual([
    [60, 118],
    [80, 118],
    [80, 80],
    [30, 80],
    [30, 100],
  ]);
});

for (const direction of ["down", "right"] as const) {
  test(`${direction}: changed endpoints retain the engine's hinted ports`, () => {
    const { graph, result } = fixture();
    graph.direction = direction;
    result.edges.ab.points = [
      [60, 18],
      [90, 18],
      [90, 118],
      [120, 118],
    ];
    const nodes = structuredClone(result.nodes);
    nodes.a[1] += 50;
    const routed = rerouteMovedEdges(graph, result, nodes, [
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
    const points = routed.edges.ab.points;
    expect(points[0]).toEqual([60, 68]);
    expect(points.at(-1)).toEqual([120, 118]);
    expect(points[1][0]).toBeGreaterThan(60);
    expect(points[1][1]).toBe(68);
    expect(points.at(-2)![0]).toBeLessThan(120);
    expect(points.at(-2)![1]).toBe(118);
    for (let i = 1; i < points.length; i++)
      expect(
        points[i][0] === points[i - 1][0] || points[i][1] === points[i - 1][1],
      ).toBe(true);
  });
}
