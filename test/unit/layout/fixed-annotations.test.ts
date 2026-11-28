import { expect, test } from "vitest";
import { ResolvedMapSchema } from "../../../src/schema";
import { placeAnnotations } from "../../../src/layout/stages/placement";
import { checkLabels } from "../../../src/layout/stages/label-check";
import fixture from "../../fixtures/map.json";

function drawing() {
  const map = ResolvedMapSchema.parse(fixture);
  map.edges.ab.label = { text: "go", at: [25, 74] };
  map.measurement = {
    name: "fixed",
    labels: { ab: { width: 20, height: 12 } },
  };
  return map;
}

test("fixed labels and numbers retain their coordinates without mutating input", () => {
  const map = drawing();
  const before = JSON.stringify(map);
  const fixed = new Set(["label:ab", "step:ab", "repeat:0:end"]);
  expect(placeAnnotations(map, fixed)).toEqual(map);
  expect(JSON.stringify(map)).toBe(before);
  expect(placeAnnotations(map)).not.toEqual(map);
});

test("a movable number avoids a fixed repeat processed after it", () => {
  const map = drawing();
  const repeat = map.scenarios[0].repeatBadges![0];
  repeat.at = [70, 70];
  map.edges.ab.badge = [...repeat.at];
  const result = placeAnnotations(map, new Set(["repeat:0:end"]));
  expect(result.scenarios[0].repeatBadges![0].at).toEqual(repeat.at);
  expect(checkLabels(map, result).steps.steps).toEqual([]);
});

test("movable labels avoid fixed numbers", () => {
  const map = drawing();
  map.edges.ab.badge = [30, 70];
  const result = placeAnnotations(map, new Set(["step:ab", "repeat:0:end"]));
  expect(result.edges.ab.badge).toEqual(map.edges.ab.badge);
  expect(result.edges.ab.label!.at).not.toEqual(map.edges.ab.label!.at);
  const report = checkLabels(map, result, {
    measureLabel: () => ({ width: 20, height: 12 }),
  });
  expect(report.steps.labels).toEqual([]);
});
