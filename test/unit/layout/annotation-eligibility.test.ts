import { expect, test } from "vitest";
import { ResolvedMapSchema } from "../../../src/schema";
import { fixedAnnotations } from "../../../src/layout/stages/fixed-annotations";
import { checkLabels } from "../../../src/layout/stages/label-check";
import fixture from "../../fixtures/map.json";

function drawing() {
  const map = ResolvedMapSchema.parse(fixture);
  map.edges.ab.label = { text: "go", at: [100, 74] };
  map.edges.ab.badge = [88, 70];
  map.scenarios[0].repeatBadges![0].at = [160, 160];
  return map;
}

const ink = { name: "ink", measure: () => ({ width: 20, height: 12 }) };
const paint = {
  name: "paint",
  measure: () => ({ width: 20, height: 12, padding: 5 }),
};

test("keeps clear labels, numbers and repeated passes", () => {
  expect(fixedAnnotations(drawing(), ink)).toEqual(
    new Set(["label:ab", "step:ab", "repeat:0:end"]),
  );
});

test("does not fix a number or label whose paint touches despite clear ink", () => {
  const map = drawing();
  expect(checkLabels(map, map, { measureLabel: paint }).steps.labels).toEqual(
    [],
  );
  expect(fixedAnnotations(map, paint)).toEqual(new Set(["repeat:0:end"]));
});

test("uses fresh ink offsets and paint rather than saved measurements", () => {
  const map = drawing();
  map.measurement = { name: "stale", labels: { ab: { width: 1, height: 1 } } };
  const before = JSON.stringify(map);
  const offset = {
    name: "offset",
    measure: () => ({ width: 20, height: 12, left: -5, ascent: 10 }),
  };
  expect(fixedAnnotations(map, offset)).toEqual(new Set(["repeat:0:end"]));
  expect(JSON.stringify(map)).toBe(before);
});

test("rejects tight box contacts for ordinary and repeated numbers", () => {
  const map = drawing();
  map.edges.ab.badge = [35, 49];
  map.scenarios[0].repeatBadges![0].at = [35, 139];
  expect(fixedAnnotations(map, ink)).toEqual(new Set(["label:ab"]));
});
