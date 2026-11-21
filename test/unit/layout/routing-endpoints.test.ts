import { expect, test } from "vitest";
import { test as property, fc } from "@fast-check/vitest";
import { ResolvedMapSchema } from "../../../src/schema.js";
import { newRoutingDefects } from "../../../src/layout/routing-defects.js";
import { check } from "../../../src/layout/stages/report.js";
import fixture from "../../fixtures/map.json";

function clean() {
  const map = ResolvedMapSchema.parse(fixture);
  map.scenarios[0].repeatBadges = [];
  delete map.edges.ab.badge;
  return map;
}

test.each([
  ["source", "M35,40 V20 H80 V100 H35", "a"],
  ["target", "M35,40 V120 H80 V100 H35", "b"],
  ["duplicate points", "M35,40 L35,40 V20 H80 V100 H35", "a"],
] as const)(
  "detects %s penetration omitted by the general checker",
  (_, path, node) => {
    const before = clean();
    const after = structuredClone(before);
    after.edges.ab.path = path;
    expect(check(before, after).hard).toBe(0);
    expect(newRoutingDefects(before, before, after)).toEqual([
      expect.objectContaining({
        a: `node:${node}`,
        b: "line:ab",
        band: "defect",
      }),
    ]);
  },
);

test("checks a self-loop against its own box once", () => {
  const before = clean();
  before.edges.ab.to = "a" as typeof before.edges.ab.to;
  before.edges.ab.path = "M60,20 H80 V30 H60";
  const after = structuredClone(before);
  after.edges.ab.path = "M60,20 H40 V30 H60";
  expect(newRoutingDefects(before, before, after)).toHaveLength(1);
});

test("boundary travel and touching an attachment are not penetration", () => {
  const before = clean();
  const after = structuredClone(before);
  after.edges.ab.path = "M60,10 V40 H35 V100";
  expect(newRoutingDefects(before, before, after)).toEqual([]);
});

property.prop([fc.integer({ min: -10000, max: 10000 })], { numRuns: 1000 })(
  "fractional translations retain endpoint diagnostics and do not mutate inputs",
  (ticks) => {
    const shift = ticks / 64;
    const before = clean();
    for (const n of Object.values(before.nodes)) n.box[0] += shift;
    before.edges.ab.path = `M${35 + shift},40 V100`;
    const after = structuredClone(before);
    after.edges.ab.path = `M${35 + shift},40 V20 H${80 + shift} V100 H${35 + shift}`;
    const saved = structuredClone({ before, after });
    const result = newRoutingDefects(before, before, after);
    expect(result).toEqual([
      expect.objectContaining({ a: "node:a", b: "line:ab", band: "defect" }),
    ]);
    expect(newRoutingDefects(before, before, after)).toEqual(result);
    expect({ before, after }).toEqual(saved);
  },
);
