import { expect, test } from "vitest";
import { createRouteInspector } from "../../../src/layout/inspect-routes.js";
import { fontTableMeasurer } from "../../../src/layout/measure.js";
import { alignSameRank } from "../../../src/layout/same-rank.js";
import { rerouteMovedEdges } from "../../../src/layout/moved-routes.js";
import { resolveMeasured } from "../../../src/layout/resolve-measured.js";
import { placeAnnotations } from "../../../src/layout/stages/placement.js";
import { check } from "../../../src/layout/stages/report.js";
import { hint, routingFixture } from "./same-rank-routing-fixture.js";

for (const down of [false, true]) {
  test(`${down ? "down" : "right"}: measured inspection refuses source penetration`, () => {
    const f = routingFixture([hint(["a", "c"])], down);
    const inspect = createRouteInspector(
      f.source,
      f.graph,
      f.original,
      fontTableMeasurer,
    );
    const outcome = alignSameRank(
      f.problem,
      f.graph,
      f.original,
      64,
      32,
      inspect,
    );
    expect(outcome).toMatchObject({
      status: "determined",
      result: f.original,
      dropped: [{ reason: "unsupported", conflicts: ["ab"] }],
    });
  });
}

test("each retry compares against the original engine drawing", () => {
  const f = routingFixture([]);
  const saved = structuredClone(f.original);
  const inspect = createRouteInspector(
    f.source,
    f.graph,
    f.original,
    fontTableMeasurer,
  );
  const moved = structuredClone(f.original.nodes);
  moved.a[0] += 40;
  const unsafe = rerouteMovedEdges(f.graph, f.original, moved);
  expect(inspect(unsafe)).toEqual(["ab"]);
  expect(inspect(f.original)).toEqual([]);
  expect(inspect(unsafe)).toEqual(["ab"]);
  expect(f.original).toEqual(saved);
});

test("a labelled candidate uses measured annotation placement before inspection", () => {
  const f = routingFixture([]);
  f.source.edges.ab.label = "Continue";
  f.graph.edges[0].label = { text: "Continue", width: 48, height: 12 };
  const original = structuredClone(f.original);
  original.edges.ab.label = [130, 80];
  const candidate = structuredClone(original);
  candidate.edges.ab.label = [80, 80];
  const saved = structuredClone(candidate);
  const measurer = {
    name: "test-font",
    width: 48,
    measure() {
      return { width: this.width, height: 12 };
    },
  };
  const inspect = createRouteInspector(f.source, f.graph, original, measurer);
  const raw = resolveMeasured(f.source, f.graph, candidate, measurer);
  expect(check(f.source, raw, { measureLabel: measurer }).hard).toBeGreaterThan(
    0,
  );
  expect(
    check(f.source, placeAnnotations(raw), { measureLabel: measurer }).hard,
  ).toBe(0);
  expect(inspect(candidate)).toEqual([]);
  expect(candidate).toEqual(saved);
});

test("measurement metadata retains wrapped text geometry before annotations", () => {
  const f = routingFixture([]);
  const size = {
    width: 48,
    height: 20,
    left: -2,
    ascent: 15,
    padding: 3,
    uncertainty: 0.125,
    lines: ["Con", "tinue"],
  };
  f.source.edges.ab.label = "Continue";
  f.graph.edges[0].label = { text: "Continue", ...size };
  f.original.edges.ab.label = [130, 80];
  const resolved = resolveMeasured(
    f.source,
    f.graph,
    f.original,
    fontTableMeasurer,
  );
  expect(resolved.measurement).toEqual({
    name: "font-table",
    labels: { ab: size },
  });
  expect(resolved.edges.ab.label).toEqual({ text: "Continue", at: [124, 101] });
  expect(() => placeAnnotations(resolved)).not.toThrow();
});
