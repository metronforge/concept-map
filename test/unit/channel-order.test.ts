import { describe, expect, it } from "vitest";
import { orderChannels } from "../../src/layout/route/channel-order.js";

const run = (
  id: string,
  low: number,
  high: number,
  left: number,
  right: number,
) => ({
  id,
  points: [
    [low, left],
    [low, 0],
    [high, 0],
    [high, right],
  ],
});

describe("channel ordering", () => {
  it("orders nested runs by their joining branches", () => {
    const routes = [
      run("z", 0, 100, -20, -20),
      run("a", 20, 80, 20, 20),
      run("b", 30, 70, 20, 20),
    ];
    const group = orderChannels(routes).find((g) => g.axis === 0)!;
    expect(group.order?.map((i) => group.segments[i].edge)).toEqual([
      "z",
      "a",
      "b",
    ]);
    expect(group.unique).toBe(true);
    expect(orderChannels([...routes].reverse())).toEqual(orderChannels(routes));
  });

  it("reports a cycle when branches demand opposite orders", () => {
    const group = orderChannels([
      {
        id: "through",
        points: [
          [0, 0],
          [100, 0],
        ],
      },
      run("switch", 20, 80, -20, 20),
    ]).find((g) => g.axis === 0)!;
    expect(group.order).toBeNull();
    expect(group.cycle).toHaveLength(3);
    expect(group.cycle[0]).toBe(group.cycle.at(-1));
    for (let i = 1; i < group.cycle.length; i++)
      expect(
        group.constraints.some(
          (rule) =>
            rule.before === group.cycle[i - 1] && rule.after === group.cycle[i],
        ),
      ).toBe(true);
  });

  it("marks identical runs as having no unique order", () => {
    const group = orderChannels([
      run("a", 0, 100, -20, -20),
      run("b", 0, 100, -20, -20),
    ]).find((g) => g.axis === 0)!;
    expect(group.unique).toBe(false);
    expect(group.constraints).toEqual([]);
  });
});
