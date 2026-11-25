import { expect, it } from "vitest";
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
