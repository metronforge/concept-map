import { expect, it } from "vitest";
import { spacingOrders } from "../../src/layout/route/channel-spacing-order.js";

it("chooses a track order when opposite joins conflict", () => {
  const groups = spacingOrders([
    {
      id: "through",
      points: [
        [0, 0],
        [100, 0],
      ],
    },
    {
      id: "switch",
      points: [
        [20, -20],
        [20, 0],
        [80, 0],
        [80, 20],
      ],
    },
  ]);
  const group = groups.find((item) => item.axis === 0)!;
  expect(group.order.map((index) => group.segments[index].edge)).toEqual([
    "switch",
    "through",
  ]);
});
