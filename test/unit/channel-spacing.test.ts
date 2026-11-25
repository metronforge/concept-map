import { describe, expect, it } from "vitest";
import { spaceChannels } from "../../src/layout/route/channel-spacing.js";

const paths = () => [
  {
    id: "a",
    points: [
      [10, 10],
      [20, 10],
      [20, 50],
      [80, 50],
      [80, 10],
      [90, 10],
    ],
  },
  {
    id: "b",
    points: [
      [10, 90],
      [30, 90],
      [30, 50],
      [70, 50],
      [70, 90],
      [90, 90],
    ],
  },
];
const problem = (routes: ReturnType<typeof paths>) => ({
  viewBox: [100, 100],
  nodes: [],
  edges: routes.map(({ id, points }) => ({
    id,
    from: {
      id: `${id}-from`,
      kind: "frame" as const,
      point: points[0],
      sides: ["right"],
    },
    to: {
      id: `${id}-to`,
      kind: "frame" as const,
      point: points.at(-1)!,
      sides: ["left"],
    },
  })),
});

describe("channel spacing", () => {
  it("separates shared runs while preserving ports and inputs", () => {
    const routes = paths(),
      input = problem(routes),
      before = structuredClone({ routes, input });
    const result = spaceChannels(input, routes);
    expect(result[0].points[2][1]).toBeLessThan(result[1].points[2][1]);
    expect(result.map((r) => [r.points[0], r.points.at(-1)])).toEqual(
      routes.map((r) => [r.points[0], r.points.at(-1)]),
    );
    expect({ routes, input }).toEqual(before);
  });
  it("rejects spacing that reverses a short leg", () => {
    const routes = paths();
    routes[0].points[0][1] = routes[0].points[1][1] = 49;
    expect(spaceChannels(problem(routes), routes)).toEqual(routes);
  });
});

it("keeps routed arrows apart along their shared channel", () => {
  const routes = paths();
  const spaced = spaceChannels(problem(routes), routes);
  const segments = (points: number[][]) =>
    points.slice(1).map((end, i) => [points[i], end]);
  for (const [a, b] of segments(spaced[0].points)) {
    for (const [c, d] of segments(spaced[1].points)) {
      const axis = a[0] === b[0] ? 1 : 0;
      const across = 1 - axis;
      if (c[across] !== d[across] || a[across] !== c[across]) continue;
      const overlap =
        Math.min(Math.max(a[axis], b[axis]), Math.max(c[axis], d[axis])) -
        Math.max(Math.min(a[axis], b[axis]), Math.min(c[axis], d[axis]));
      expect(overlap).toBeLessThanOrEqual(1);
    }
  }
});
