import assert from "node:assert/strict";
import { test } from "node:test";
import { orderChannels } from "./channel-order.mjs";
import * as coupling from "./channel-coupling.mjs";

const coupled = (routes) => {
  assert.equal(typeof coupling.coupleChannels, "function");
  return coupling.coupleChannels(routes);
};
const corner = (id, dx, dy, tail) => ({
  id,
  points: [[dx * 20, 0], [0, 0], [0, dy * 20], ...(tail ?? [])],
});
const orderedEdges = (result, axis) => {
  const index = result.groups.findIndex((g) => g.axis === axis);
  const component = result.components.find((c) => c.groups.includes(index));
  return component.orders[component.groups.indexOf(index)].map(
    (i) => result.groups[index].segments[i].edge,
  );
};

test("shared bends couple orders in every quadrant instead of choosing each run independently", () => {
  for (const [dx, dy, expected] of [
    [-1, -1, ["a", "b"]],
    [-1, 1, ["b", "a"]],
    [1, -1, ["b", "a"]],
    [1, 1, ["a", "b"]],
  ]) {
    const routes = [corner("a", dx, dy), corner("b", dx, dy)];
    const result = coupled(routes);
    assert.deepEqual(result.groups, orderChannels(routes));
    assert.equal(result.bends.length, 1);
    assert.deepEqual(orderedEdges(result, 0), ["a", "b"]);
    assert.deepEqual(orderedEdges(result, 1), expected);
  }
});

test("a branch order propagates through a shared bend", () => {
  const routes = [
    corner("a", -1, 1, [[-20, 20]]),
    corner("b", -1, 1, [[20, 20]]),
  ];
  const result = coupled(routes);
  assert.deepEqual(orderedEdges(result, 0), ["b", "a"]);
  assert.deepEqual(orderedEdges(result, 1), ["a", "b"]);
});

test("opposing branch orders at linked bends refuse the whole component", () => {
  const routes = [
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
  ];
  const result = coupled(routes);
  assert.ok(result.groups.every((g) => g.order !== null));
  assert.equal(result.components.length, 1);
  assert.equal(result.components[0].orders, null);
});

test("point touches and opposite-turn branches do not create bend links", () => {
  const routes = [corner("a", -1, 1), corner("b", -1, -1)];
  assert.equal(coupled(routes).bends.length, 0);
  assert.deepEqual(coupled([]), { groups: [], bends: [], components: [] });
});

test("orders propagate through three bends and backtrack from an incompatible first choice", () => {
  const points = [
    [-20, 0],
    [0, 0],
    [0, 20],
    [20, 20],
    [20, 40],
  ];
  const routes = [
    { id: "a", points: [...points, [0, 40]] },
    { id: "b", points: [...points, [40, 40]] },
  ];
  const result = coupled(routes);
  assert.equal(result.bends.length, 3);
  assert.equal(result.components.length, 1);
  const component = result.components[0];
  assert.ok(component.orders);
  assert.deepEqual(orderedEdges(result, 0), ["b", "a"]);
  const last = result.groups.findIndex(
    (g) => g.axis === 1 && g.coordinate === 20,
  );
  assert.deepEqual(
    component.orders[component.groups.indexOf(last)].map(
      (i) => result.groups[last].segments[i].edge,
    ),
    ["a", "b"],
  );
});
