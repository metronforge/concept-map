import { test, expect } from "vitest";
import {
  geometryMetrics,
  polyline,
} from "../../../scripts/comparison/metrics.mjs";
const edge = (path: string) => ({ path });
test("SVG polyline parsing supports the corpus and rejects unsupported curves", () => {
  expect(polyline("M1 2 H4 V8 L9 10")).toEqual([
    [1, 2],
    [4, 2],
    [4, 8],
    [9, 10],
  ]);
  expect(() => polyline("M0 0 C1 2 3 4 5 6")).toThrow();
});
test("crossings count unique interior intersections, not endpoint or overlap contacts", () => {
  const metric = (paths: string[]) =>
    geometryMetrics({
      viewBox: [20, 30],
      edges: Object.fromEntries(paths.map((p, i) => [i, edge(p)])),
    });
  expect(metric(["M0 5 H10", "M5 0 V10"]).crossings).toBe(1);
  expect(metric(["M0 0 H5", "M5 0 V5"]).crossings).toBe(0);
  expect(metric(["M0 0 H10", "M5 0 H15"]).crossings).toBe(0);
  expect(metric(["M0 5 H5 H10", "M5 0 V10"]).crossings).toBe(1);
  expect(metric(["M0 0 L5 5 L10 0", "M0 5 H10"]).crossings).toBe(0);
  expect(metric(["M0 0 L5 5 L10 10", "M0 10 L5 5 L10 0"]).crossings).toBe(1);
  expect(metric(["M0 0 H5 V5 V10"]).bends).toBe(1);
  expect(metric(["M0 0 H5 V5"]).area).toBe(600);
});
