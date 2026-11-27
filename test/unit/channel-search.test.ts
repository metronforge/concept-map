import { expect, it } from "vitest";
import { shortestChannel } from "../../src/layout/route/channel-search.js";
import { channelGrid } from "../../src/layout/route/channel-grid.js";

it("routes around an obstacle while respecting terminal sides", () => {
  const from = {
    id: "a",
    kind: "node" as const,
    point: [10, 5] as [number, number],
    sides: ["right" as const],
  };
  const to = {
    id: "b",
    kind: "node" as const,
    point: [40, 5] as [number, number],
    sides: ["left" as const],
  };
  const nodes = [
    { id: "a", box: [0, 0, 10, 10] as [number, number, number, number] },
    {
      id: "obstacle",
      box: [20, 0, 10, 10] as [number, number, number, number],
    },
    { id: "b", box: [40, 0, 10, 10] as [number, number, number, number] },
  ];
  const route = shortestChannel(channelGrid(nodes, { from, to }), { from, to });
  expect(route).toEqual([
    [10, 5],
    [15, 5],
    [15, 26],
    [35, 26],
    [35, 5],
    [40, 5],
  ]);
});
