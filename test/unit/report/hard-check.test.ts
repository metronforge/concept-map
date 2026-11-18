import { expect, test } from "vitest";
import { ResolvedMapSchema } from "../../../src/schema";
import { check } from "../../../src/layout/stages/report";
import { checkHard } from "../../../src/layout/stages/hard-check";
import fixture from "../../fixtures/map.json";
import { resolvedMaps } from "../fixtures/maps";

test.each(resolvedMaps())(
  "hard check retains every hard defect of book map $id",
  ({ map }) => {
    const { crossings, reading, text, ...hard } = check(map, map);
    expect(checkHard(map, map)).toEqual(hard);
  },
);

test("hard check independently rejects lane containment and line/box defects", () => {
  const source = ResolvedMapSchema.parse(fixture);
  source.nodes.c = { ...source.nodes.b, box: [90, 60, 30, 20] };
  const map = structuredClone(source);
  map.nodes.a.box = [300, 10, 50, 30];
  map.nodes.c = { ...map.nodes.b, box: [20, 60, 30, 20] };
  const result = checkHard(source, map);
  expect(result.constraints[0].holds).toBe(false);
  expect(result.lines.boxes).toContainEqual(
    expect.objectContaining({ a: "node:c", b: "line:ab", band: "defect" }),
  );
  expect(result.hard).toBeGreaterThanOrEqual(2);
});

test("hard check uses supplied font metrics and tolerance, not saved measurements", () => {
  const map = ResolvedMapSchema.parse(fixture);
  map.scenarios[0].repeatBadges = [];
  map.edges.ab.label = { text: "go", at: [30, 80] };
  map.edges.ab.badge = [80, 70];
  map.measurement = {
    name: "untrusted",
    labels: { ab: { width: 0, height: 0 } },
  };
  const result = checkHard(map, map, {
    measureLabel: () => ({ width: 20, height: 12 }),
    textSize: 20,
    tolerance: 0.3,
  });
  expect(result.hard).toBe(0);
  expect(result.labels.lines).toEqual([
    { a: "label:ab", b: "line:ab", band: "tight", gap: -0.25 },
  ]);
});
