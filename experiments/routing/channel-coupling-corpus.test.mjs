import assert from "node:assert/strict";
import { test } from "node:test";
import { inputs, sameRankInputs } from "./inputs.mjs";
import { prepare } from "./prepare.mjs";
import { routeIndependent as routeChannel } from "./channel-independent.mjs";
import { coupleChannels } from "./channel-coupling.mjs";
import { orderChannels } from "./channel-order.mjs";

function verify(result) {
  const { groups, bends, components } = result;
  const assigned = new Map();
  assert.deepEqual(
    components.flatMap((c) => c.groups).sort((a, b) => a - b),
    groups.map((_, i) => i),
  );
  for (const component of components) {
    // The corpus's blocked components have an independently recorded local cycle.
    assert.equal(
      component.orders === null,
      component.groups.some((i) => groups[i].cycle.length),
    );
    if (!component.orders) continue;
    for (const [k, index] of component.groups.entries()) {
      const order = component.orders[k];
      assert.deepEqual(
        [...order].sort((a, b) => a - b),
        groups[index].segments.map((_, i) => i),
      );
      for (const rule of groups[index].constraints)
        assert.ok(order.indexOf(rule.before) < order.indexOf(rule.after));
      assigned.set(index, order);
    }
  }
  for (const { horizontal: h, vertical: v, sameOrder } of bends) {
    assert.equal(assigned.has(h.group), assigned.has(v.group));
    if (!assigned.has(h.group)) continue;
    const earlier = (side) =>
      assigned.get(side.group).indexOf(side.segments[0]) <
      assigned.get(side.group).indexOf(side.segments[1]);
    assert.equal(earlier(h) === earlier(v), sameOrder);
  }
}

function geometricBends(routes) {
  const corners = routes.flatMap(({ id, points }) =>
    points.slice(1, -1).map((at, i) => {
      const neighbours = [points[i], points[i + 2]];
      const horizontal = neighbours.find((p) => p[1] === at[1]);
      const vertical = neighbours.find((p) => p[0] === at[0]);
      return {
        edge: id,
        at,
        dx: Math.sign(horizontal[0] - at[0]),
        dy: Math.sign(vertical[1] - at[1]),
      };
    }),
  );
  return corners.flatMap((a, i) =>
    corners
      .slice(i + 1)
      .flatMap((b) =>
        a.edge !== b.edge &&
        a.at.every((v, k) => v === b.at[k]) &&
        a.dx === b.dx &&
        a.dy === b.dy
          ? [{ corner: a.at, edges: [a.edge, b.edge].sort() }]
          : [],
      ),
  );
}

function named(result) {
  return result.components.map((component) => ({
    groups: component.groups,
    orders:
      component.orders?.map((order, k) =>
        order.map((i) => result.groups[component.groups[k]].segments[i].edge),
      ) ?? null,
  }));
}

test("all corpus bend links and joint orders are independently checked without moving any route", async () => {
  let bendCount = 0;
  for (const item of [...(await inputs()), ...(await sameRankInputs())]) {
    const routes = routeChannel(prepare(item)),
      before = structuredClone(routes);
    const result = coupleChannels(routes);
    verify(result);
    assert.deepEqual(result.groups, orderChannels(routes));
    const observed = result.bends.map((b) => ({
      corner: b.corner,
      edges: b.horizontal.segments
        .map((i) => result.groups[b.horizontal.group].segments[i].edge)
        .sort(),
    }));
    const sorted = (values) => values.map((v) => JSON.stringify(v)).sort();
    assert.deepEqual(sorted(observed), sorted(geometricBends(routes)), item.id);
    assert.deepEqual(coupleChannels([...routes].reverse()), result);
    const reversed = routes.map((r) => ({
      ...r,
      points: [...r.points].reverse(),
    }));
    assert.deepEqual(named(coupleChannels(reversed)), named(result));
    assert.deepEqual(routes, before);
    bendCount += observed.length;
  }
  assert.ok(bendCount > 0);
});
