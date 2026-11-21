import assert from "node:assert/strict";
import { midpoint, besideRoute } from "../../dist/layout/geometry.js";
import { measureMono } from "../../dist/layout/text-size.js";
import { placeAnnotations } from "../../dist/layout/stages/placement.js";
import { polylines } from "../../dist/layout/stages/paths.js";

function routeIndex(map, routes) {
  assert.deepEqual(
    routes.map((r) => r.id).sort(),
    Object.keys(map.edges).sort(),
    "Expected exactly one route per edge",
  );
  for (const route of routes) {
    assert.ok(!route.failure, `Failed route: ${route.id}`);
    assert.ok(
      Array.isArray(route.points) &&
        route.points.length >= 2 &&
        route.points.every(
          (p) => Array.isArray(p) && p.length === 2 && p.every(Number.isFinite),
        ),
      `Invalid route: ${route.id}`,
    );
  }
  return Object.fromEntries(routes.map((r) => [r.id, r.points]));
}

function seedLabel(text, points, viewBox, sizes, id) {
  const size = measureMono(text, { fontSize: 10.5, mono: true });
  sizes[id] = size;
  const [x, y] = besideRoute(points, size.width, size.height);
  const left = Math.max(
    0,
    Math.min(viewBox[0] - size.width, x - size.width / 2),
  );
  const top = Math.max(
    0,
    Math.min(viewBox[1] - size.height, y - size.height / 2),
  );
  return { text, at: [left, top + (size.height * 5) / 6] };
}

/** Use identical fresh annotation seeds; never inherit an old label position. */
export function assemble({ resolved }, routes) {
  const map = structuredClone(resolved);
  const indexed = routeIndex(map, routes);
  const labels = {};
  for (const [id, edge] of Object.entries(map.edges)) {
    const points = indexed[id];
    edge.path = `M${points.map((p) => p.join(" ")).join(" L")}`;
    if (edge.label)
      edge.label = seedLabel(edge.label.text, points, map.viewBox, labels, id);
    if (edge.badge) edge.badge = midpoint(points);
  }
  for (const scenario of map.scenarios)
    for (const repeat of scenario.repeatBadges ?? [])
      repeat.at = midpoint(indexed[repeat.edge]);
  map.measurement = { name: "font-table", labels };
  return placeAnnotations(map);
}

/** check() does not count viewport clipping; retain this separate fact. */
export function outsideViewport(map) {
  return Object.entries(map.edges).flatMap(([id, edge]) =>
    polylines(edge.path).some((line) =>
      line.some(
        ([x, y]) => x < 0 || y < 0 || x > map.viewBox[0] || y > map.viewBox[1],
      ),
    )
      ? [id]
      : [],
  );
}
