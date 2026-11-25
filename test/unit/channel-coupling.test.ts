import { describe, expect, it } from "vitest";
import { coupleChannels } from "../../src/layout/route/channel-coupling.js";

const corner = (id: string, dx: number, dy: number, tail: number[][] = []) => ({
  id,
  points: [[dx * 20, 0], [0, 0], [0, dy * 20], ...tail],
});

function orderedEdges(result: ReturnType<typeof coupleChannels>, axis: number) {
  const index = result.groups.findIndex((group) => group.axis === axis);
  const component = result.components.find((item) =>
    item.groups.includes(index),
  )!;
  return component.orders![component.groups.indexOf(index)].map(
    (i) => result.groups[index].segments[i].edge,
  );
}

describe("coupled channel orders", () => {
  it("coordinates shared turns in each quadrant", () => {
    for (const [dx, dy] of [
      [-1, -1],
      [-1, 1],
      [1, -1],
      [1, 1],
    ]) {
      const result = coupleChannels([corner("a", dx, dy), corner("b", dx, dy)]);
      expect(result.bends).toHaveLength(1);
      expect(orderedEdges(result, 0)).toEqual(["a", "b"]);
      expect(orderedEdges(result, 1)).toEqual(
        dx * dy === 1 ? ["a", "b"] : ["b", "a"],
      );
    }
  });

  it("backtracks to satisfy a later branch", () => {
    const points = [
      [-20, 0],
      [0, 0],
      [0, 20],
      [20, 20],
      [20, 40],
    ];
    const result = coupleChannels([
      { id: "a", points: [...points, [0, 40]] },
      { id: "b", points: [...points, [40, 40]] },
    ]);
    expect(result.bends).toHaveLength(3);
    expect(result.components[0].orders).not.toBeNull();
    expect(orderedEdges(result, 0)).toEqual(["b", "a"]);
  });

  it("refuses incompatible linked branch orders", () => {
    const result = coupleChannels([
      {
        id: "a",
        points: [
          [-20, -20],
          [-20, 0],
          [0, 0],
          [0, 20],
          [-10, 20],
        ],
      },
      {
        id: "b",
        points: [
          [-20, 20],
          [-20, 0],
          [0, 0],
          [0, 20],
          [10, 20],
        ],
      },
    ]);
    expect(result.groups.every((group) => group.order !== null)).toBe(true);
    expect(result.components).toHaveLength(1);
    expect(result.components[0].orders).toBeNull();
  });
});
