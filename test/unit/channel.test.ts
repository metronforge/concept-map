import { expect, it } from "vitest";
import fc from "fast-check";
import { routeIssues } from "../../src/layout/route/route-audit.js";
import { routeChannel } from "../../src/layout/route/channel.js";

it("routes around boxes and reports blocked ports", () => {
  const terminal = (id: string, x: number, side: "right" | "left") => ({
    id,
    kind: "node" as const,
    point: [x, 5] as [number, number],
    sides: [side],
  });
  const edges = [
    {
      id: "ab",
      from: terminal("a", 10, "right"),
      to: terminal("b", 40, "left"),
    },
  ];
  const nodes = [
    { id: "a", box: [0, 0, 10, 10] as [number, number, number, number] },
    { id: "b", box: [40, 0, 10, 10] as [number, number, number, number] },
    { id: "wall", box: [20, 0, 10, 10] as [number, number, number, number] },
  ];
  const [route] = routeChannel({ nodes, edges });
  expect(route.points?.some(([, y]) => y > 10 || y < 0)).toBe(true);
  nodes[2].box = [10, 0, 10, 10];
  expect(routeChannel({ nodes, edges })).toEqual([
    { id: "ab", failure: "no channel path" },
  ]);
});

it("preserves ports and avoids generated obstacles", () => {
  fc.assert(
    fc.property(
      fc.integer({ min: 20, max: 60 }),
      fc.integer({ min: -5, max: 5 }),
      fc.integer({ min: 5, max: 15 }),
      (wallX, wallY, wallHeight) => {
        const nodes = [
          { id: "a", box: [0, 0, 10, 10] as [number, number, number, number] },
          { id: "b", box: [90, 0, 10, 10] as [number, number, number, number] },
          {
            id: "wall",
            box: [wallX, wallY, 10, wallHeight] as [
              number,
              number,
              number,
              number,
            ],
          },
        ];
        const edge = {
          id: "ab",
          from: {
            id: "a",
            kind: "node" as const,
            point: [10, 5] as [number, number],
            sides: ["right" as const],
          },
          to: {
            id: "b",
            kind: "node" as const,
            point: [90, 5] as [number, number],
            sides: ["left" as const],
          },
        };
        const route = routeChannel({ nodes, edges: [edge] })[0];
        expect(route.points).toBeDefined();
        expect(routeIssues({ nodes }, edge, { points: route.points! })).toEqual(
          [],
        );
      },
    ),
  );
});
