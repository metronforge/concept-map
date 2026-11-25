import { describe, expect, it } from "vitest";
import { channelGrid, permits } from "../../src/layout/route/channel-grid.js";

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
  { id: "b", box: [40, 0, 10, 10] as [number, number, number, number] },
];

describe("channel grid", () => {
  it("allows leaving a port but blocks a segment through a box", () => {
    const grid = channelGrid(nodes, { from, to });
    const neighbours = grid.neighbours(grid.start);
    expect(neighbours.some((link) => link.direction === 0)).toBe(true);
    expect(neighbours.some((link) => link.direction === 2)).toBe(false);
    expect(permits(from, 0)).toBe(true);
    expect(permits(from, 2)).toBe(false);
  });
  it("rejects a terminal outside the viewport", () => {
    const grid = channelGrid(
      nodes,
      { from: { ...from, point: [-1, 5] }, to },
      [50, 20],
    );
    expect(grid.start).toBe(-1);
  });
});
