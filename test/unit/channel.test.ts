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

it("routes a same-port self-loop with area and clear boxes", () => {
  const terminal = {
    id: "a",
    kind: "node" as const,
    point: [10, 5] as [number, number],
    sides: ["right" as const],
  };
  const nodes = [
    { id: "a", box: [0, 0, 10, 10] as [number, number, number, number] },
    { id: "b", box: [40, 0, 10, 10] as [number, number, number, number] },
  ];
  const edge = { id: "loop", from: terminal, to: terminal };
  const route = routeChannel({ nodes, edges: [edge] })[0];
  expect(route.points!.length).toBeGreaterThanOrEqual(5);
  expect(new Set(route.points!.map(([x]) => x)).size).toBeGreaterThan(1);
  expect(new Set(route.points!.map(([, y]) => y)).size).toBeGreaterThan(1);
  expect(routeIssues({ nodes }, edge, { points: route.points! })).toEqual([]);
});

it("keeps independently routed arrows apart outside their ports", () => {
  const terminal = (
    id: string,
    x: number,
    y: number,
    side: "right" | "left",
  ) => ({
    id,
    kind: "frame" as const,
    point: [x, y] as [number, number],
    sides: [side],
  });
  const edges = [
    {
      id: "a",
      from: terminal("a-from", 10, 40, "right"),
      to: terminal("a-to", 90, 40, "left"),
    },
    {
      id: "b",
      from: terminal("b-from", 10, 45, "right"),
      to: terminal("b-to", 90, 45, "left"),
    },
  ];
  const nodes = [
    { id: "wall", box: [40, 20, 20, 60] as [number, number, number, number] },
  ];
  const routes = routeChannel({ nodes, edges, viewBox: [100, 100] });
  expect(routes.every((route) => route.points)).toBe(true);
  expect(routes.every((route) => route.points!.some(([, y]) => y < 20))).toBe(
    true,
  );
  const segments = (points: number[][]) =>
    points.slice(1).map((end, i) => [points[i], end]);
  for (const [a, b] of segments(routes[0].points!)) {
    for (const [c, d] of segments(routes[1].points!)) {
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

it("honors outward sides when they require a detour", () => {
  const nodes = [
    { id: "a", box: [0, 0, 10, 10] as [number, number, number, number] },
    { id: "b", box: [40, 0, 10, 10] as [number, number, number, number] },
  ];
  const edge = {
    id: "ab",
    from: {
      id: "a",
      kind: "node" as const,
      point: [5, 0] as [number, number],
      sides: ["top" as const],
    },
    to: {
      id: "b",
      kind: "node" as const,
      point: [45, 10] as [number, number],
      sides: ["bottom" as const],
    },
  };
  const route = routeChannel({ nodes, edges: [edge] })[0];
  expect(route.points).toBeDefined();
  expect(route.points![1][1]).toBeLessThan(0);
  expect(route.points!.at(-2)![1]).toBeGreaterThan(10);
  expect(routeIssues({ nodes }, edge, { points: route.points! })).toEqual([]);
});
