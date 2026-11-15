import { test, expect } from "vitest";
import { routeSelfEdges } from "../../../src/layout/self-route";
import type { LayoutGraph, LayoutResult } from "../../../src/layout/types";

for (const neighborX of [-104, 104])
  for (const label of [undefined, { width: 150, height: 14 }])
    test(`compact loop avoids neighbor at ${neighborX} with label ${!!label}`, () => {
      const graph: LayoutGraph = {
        nodes: [
          { id: "a", width: 80, height: 40 },
          { id: "b", width: 80, height: 40 },
        ],
        edges: [{ id: "loop", from: "a", to: "a", label }],
        lanes: [],
      };
      const result: LayoutResult = {
        nodes: { a: [0, 0, 80, 40], b: [neighborX, 0, 80, 40] },
        edges: {},
        lanes: {},
      };
      const route = routeSelfEdges(graph, result).edges.loop;
      for (const [x, y] of route.points) {
        expect(neighborX > 0 ? x <= 0 : x >= 80).toBe(true);
        expect(y).toBeGreaterThanOrEqual(0);
        expect(y).toBeLessThanOrEqual(40);
      }
      if (label) {
        const [x, y] = route.label!;
        expect(
          neighborX > 0 ? x + label.width / 2 < 0 : x - label.width / 2 > 80,
        ).toBe(true);
        expect(y - label.height / 2).toBeGreaterThanOrEqual(0);
        expect(y + label.height / 2).toBeLessThanOrEqual(40);
      } else expect(route.label).toBeUndefined();
    });

for (const occupiedTop of [false, true])
  test(`compact loop uses a free vertical side with top occupied ${occupiedTop}`, () => {
    const graph: LayoutGraph = {
      nodes: [{ id: "a", width: 80, height: 40 }],
      edges: [
        { id: "loop", from: "a", to: "a", label: { width: 60, height: 14 } },
      ],
      lanes: [],
    };
    const result: LayoutResult = {
      nodes: {
        a: [0, 0, 80, 40],
        left: [-104, 0, 80, 40],
        right: [104, 0, 80, 40],
        ...(occupiedTop
          ? { top: [-10, -80, 100, 40] as [number, number, number, number] }
          : {}),
      },
      edges: {},
      lanes: {},
    };
    const route = routeSelfEdges(graph, result).edges.loop;
    expect(
      route.points.every(([, y]) => (occupiedTop ? y >= 40 : y <= 0)),
    ).toBe(true);
    expect(
      Math.max(...route.points.map(([, y]) => y)) -
        Math.min(...route.points.map(([, y]) => y)),
    ).toBeLessThanOrEqual(40);
    if (occupiedTop) expect(route.label![1] - 7).toBeGreaterThan(40);
    else expect(route.label![1] + 7).toBeLessThan(0);
  });

test("two self-transitions keep separate compact loops and labels", () => {
  const graph: LayoutGraph = {
    nodes: [{ id: "a", width: 80, height: 40 }],
    edges: ["first", "second"].map((id) => ({
      id,
      from: "a",
      to: "a",
      label: { width: 100, height: 14 },
    })),
    lanes: [],
  };
  const result = routeSelfEdges(graph, {
    nodes: { a: [0, 0, 80, 40] },
    edges: {},
    lanes: {},
  });
  const first = result.edges.first,
    second = result.edges.second;
  expect(first.points).not.toEqual(second.points);
  expect(
    Math.abs(first.label![0] - second.label![0]) >= 100 + 12 ||
      Math.abs(first.label![1] - second.label![1]) >= 14 + 12,
  ).toBe(true);
  for (const route of [first, second])
    expect(
      Math.max(...route.points.map(([, y]) => y)) -
        Math.min(...route.points.map(([, y]) => y)),
    ).toBeLessThanOrEqual(40);
});
