import assert from "node:assert/strict";
import { test } from "node:test";
import { ResolvedMapSchema } from "../../dist/schema.js";
import { polylines } from "../../dist/layout/stages/paths.js";
import { inputs } from "./inputs.mjs";
import { prepare } from "./prepare.mjs";
import { routeChannel } from "./channel.mjs";
import { loadAvoid, routeAvoid } from "./avoid.mjs";
import { assemble, outsideViewport } from "./assemble.mjs";

const cases = await inputs();
const avoid = await loadAvoid();
const candidates = [routeChannel, (problem) => routeAvoid(avoid, problem)];

test("assembly retains all fixed boxes, exact routes and scenario meaning", () => {
  for (const item of cases)
    for (const route of candidates) {
      const before = JSON.stringify(item);
      const routes = route(prepare(item));
      const snapshot = JSON.stringify(routes);
      const map = assemble(item, routes);
      assert.ok(ResolvedMapSchema.safeParse(map).success, item.id);
      for (const key of ["nodes", "frames", "lanes", "viewBox"])
        assert.deepEqual(map[key], item.resolved[key], `${item.id}: ${key}`);
      for (const { id, points } of routes) {
        assert.deepEqual(polylines(map.edges[id].path), [points]);
        assert.equal(
          map.edges[id].label?.text,
          item.resolved.edges[id].label?.text,
        );
        assert.equal(!!map.edges[id].badge, !!item.resolved.edges[id].badge);
      }
      const semantics = (scenarios) =>
        scenarios.map((s) => ({
          ...s,
          ...(s.repeatBadges
            ? { repeatBadges: s.repeatBadges.map(({ at, ...b }) => b) }
            : {}),
        }));
      assert.deepEqual(
        semantics(map.scenarios),
        semantics(item.resolved.scenarios),
      );
      assert.equal(JSON.stringify(item), before);
      assert.equal(JSON.stringify(routes), snapshot);
    }
});

test("old labels, numbers, measurements and route interiors cannot bias assembly", () => {
  for (const item of cases) {
    const routes = routeChannel(prepare(item));
    const poisoned = structuredClone(item);
    for (const edge of Object.values(poisoned.resolved.edges)) {
      edge.path = "M99999 99999 L99998 99998";
      if (edge.label) edge.label.at = [99999, -99999];
      if (edge.badge) edge.badge = [-99999, 99999];
    }
    for (const s of poisoned.resolved.scenarios)
      for (const b of s.repeatBadges ?? []) b.at = [99999, 99999];
    poisoned.resolved.measurement = { name: "untrusted", labels: {} };
    assert.deepEqual(
      assemble(poisoned, routes),
      assemble(item, routes),
      item.id,
    );
  }
});

test("assembly rejects missing, duplicate, failed and malformed routes", () => {
  const item = cases[0];
  const routes = routeChannel(prepare(item));
  assert.throws(() => assemble(item, routes.slice(1)), /route/i);
  assert.throws(() => assemble(item, [...routes, routes[0]]), /route/i);
  assert.throws(
    () =>
      assemble(
        item,
        routes.map((r, i) => (i ? r : { id: r.id, failure: "blocked" })),
      ),
    /route/i,
  );
  for (const points of [
    [],
    [[0, 0]],
    [
      [0, 0],
      [NaN, 1],
    ],
  ])
    assert.throws(
      () =>
        assemble(
          item,
          routes.map((r, i) => (i ? r : { id: r.id, points })),
        ),
      /route/i,
    );
});

test("overflow audit retains negative and excessive coordinates, not boundary contact", () => {
  const map = {
    viewBox: [100, 80],
    edges: {
      left: { path: "M0 10 L-2 10 L0 20" },
      right: { path: "M90 20 L102 20" },
      inside: { path: "M0 0 L100 0 L100 80" },
    },
  };
  assert.deepEqual(outsideViewport(map), ["left", "right"]);
});
