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

test("nested runs follow their branches rather than edge names or input order", () => {
  const routes = [
    run("z", 0, 100, -20, -20),
    run("a", 20, 80, 20, 20),
    run("b", 30, 70, 20, 20),
  ];
  const before = structuredClone(routes),
    groups = horizontal(routes);
  assert.deepEqual(edgeOrder(groups[0]), ["z", "a", "b"]);
  assert.equal(groups[0].unique, true);
  assert.deepEqual(horizontal([...routes].reverse()), groups);
  assert.deepEqual(routes, before);
});

test("opposite branches at the same join determine the order", () => {
  const [group] = horizontal([
    run("below", 0, 100, 20, 20),
    run("above", 0, 100, -20, -20),
  ]);
  assert.deepEqual(edgeOrder(group), ["above", "below"]);
});

test("reversing arrows or exchanging axes preserves the geometric order", () => {
  const routes = [run("outer", 0, 100, -20, -20), run("inner", 20, 80, 20, 20)];
  const expected = edgeOrder(horizontal(routes)[0]);
  const reversed = routes.map((r) => ({
    ...r,
    points: [...r.points].reverse(),
  }));
  const transposed = routes.map((r) => ({
    ...r,
    points: r.points.map(([x, y]) => [y, x]),
  }));
  assert.deepEqual(edgeOrder(horizontal(reversed)[0]), expected);
  assert.deepEqual(
    edgeOrder(orderChannels(transposed).find((g) => g.axis === 1)),
    expected,
  );
});

test("contradictory exits return a directed cycle instead of a track order", () => {
  const routes = [
    route("through", [
      [0, 0],
      [100, 0],
    ]),
    run("switch", 20, 80, -20, 20),
  ];
  const [group] = horizontal(routes);
  assert.equal(group.order, null);
  assert.equal(group.cycle.length, 3);
  assert.equal(group.cycle[0], group.cycle.at(-1));
  for (let i = 1; i < group.cycle.length; i++)
    assert.ok(
      group.constraints.some(
        (r) => r.before === group.cycle[i - 1] && r.after === group.cycle[i],
      ),
    );
});

test("shared terminals and same-side bends leave the order underdetermined", () => {
  for (const points of [
    [
      [0, 0],
      [100, 0],
    ],
    [
      [0, -20],
      [0, 0],
      [100, 0],
      [100, -20],
    ],
  ]) {
    const [group] = horizontal([route("a", points), route("b", points)]);
    assert.equal(group.unique, false);
    assert.deepEqual(group.constraints, []);
    assert.deepEqual(edgeOrder(group), ["a", "b"]);
  }
});

test("point contacts stay separate while overlap chains form one group", () => {
  const a = route("a", [
      [0, 0],
      [10, 0],
    ]),
    b = route("b", [
      [10, 0],
      [20, 0],
    ]);
  assert.deepEqual(orderChannels([a, b]), []);
  const [group] = orderChannels([
    a,
    b,
    route("bridge", [
      [5, 0],
      [15, 0],
    ]),
  ]);
  assert.equal(group.segments.length, 3);
  assert.deepEqual([group.start, group.end], [0, 20]);
});

test("extra straight vertices do not split a shared run", () => {
  const routes = [
    route("a", [
      [0, 0],
      [10, 0],
      [20, 0],
    ]),
    route("b", [
      [0, 0],
      [20, 0],
    ]),
  ];
  assert.equal(orderChannels(routes)[0].segments.length, 2);
});

test("failed, duplicate and non-orthogonal inputs cannot become orders", () => {
  assert.throws(() =>
    orderChannels([{ id: "missing", failure: "no channel path" }]),
  );
  assert.throws(() =>
    orderChannels([
      route("a", [
        [0, 0],
        [1, 1],
      ]),
    ]),
  );
  assert.throws(() =>
    orderChannels([
      route("a", [
        [0, 0],
        [0, 0],
      ]),
    ]),
  );
  const a = route("a", [
    [0, 0],
    [1, 0],
  ]);
  assert.throws(() => orderChannels([a, a]));
});
