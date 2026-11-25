import assert from "node:assert/strict";
import { test } from "node:test";
import { orderChannels } from "./channel-order.mjs";

const route = (id, points) => ({ id, points });
const run = (id, low, high, left, right) =>
  route(id, [
    [low, left],
    [low, 0],
    [high, 0],
    [high, right],
  ]);
const horizontal = (routes) =>
  orderChannels(routes).filter((g) => g.axis === 0);
const edgeOrder = (group) => group.order?.map((i) => group.segments[i].edge);

// Enumerate every order independently and count actual transverse intersections.
function validOrders(routes) {
  const orders = [
    [0, 1, 2],
    [0, 2, 1],
    [1, 0, 2],
    [1, 2, 0],
    [2, 0, 1],
    [2, 1, 0],
  ];
  return orders.filter((order) => {
    const heights = routes.map((_, i) => order.indexOf(i) - 1);
    return routes.every(({ points }, i) =>
      [0, 3].every((end) => {
        const [x, y] = points[end];
        return routes.every(
          ({ points: other }, j) =>
            i === j ||
            !(
              other[1][0] < x &&
              x < other[2][0] &&
              Math.min(y, heights[i]) < heights[j] &&
              heights[j] < Math.max(y, heights[i])
            ),
        );
      }),
    );
  });
}

test("constraints match every crossing-free order of 192 branch arrangements", () => {
  let checked = 0;
  for (const ends of [
    [10, 20, 30],
    [30, 20, 10],
    [20, 30, 10],
  ]) {
    for (let mask = 0; mask < 64; mask++) {
      const routes = ends.map((end, i) =>
        run(
          String(i),
          i,
          end,
          mask & (1 << (i * 2)) ? 20 : -20,
          mask & (2 << (i * 2)) ? 20 : -20,
        ),
      );
      const [group] = horizontal(routes),
        valid = validOrders(routes);
      assert.equal(group.order === null, valid.length === 0);
      if (group.order) {
        const actual = edgeOrder(group).map(Number);
        assert.ok(
          valid.some((order) => order.every((n, i) => n === actual[i])),
        );
        assert.equal(group.unique, valid.length === 1);
      }
      checked++;
    }
  }
  assert.equal(checked, 192);
});
