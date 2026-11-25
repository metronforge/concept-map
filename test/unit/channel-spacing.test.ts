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
