import { test, expect } from "vitest";
import {
  bends,
  geometryMetrics,
} from "../../../scripts/comparison/metrics.mjs";
import { check } from "../../../src/layout/index";
import { crossings } from "../../../src/layout/stages/plane";
import { polylines } from "../../../src/layout/stages/paths";
import { resolvedMaps } from "../fixtures/maps";

test("bends count changes of direction, not straight continuations", () => {
  expect(bends(["M0 0 H5 V5 V10"])).toBe(1);
  expect(bends(["M0 0 H5 H10"])).toBe(0);
  expect(bends(["M0 0 H5 H0"])).toBe(1);
});

test("crossings count unique interior intersections, not endpoint or overlap contacts", () => {
  const count = (a: string, b: string) =>
    crossings(polylines(a)[0], polylines(b)[0]).length;
  expect(count("M0 5 H10", "M5 0 V10")).toBe(1);
  expect(count("M0 0 H5", "M5 0 V5")).toBe(0);
  expect(count("M0 0 H10", "M5 0 H15")).toBe(0);
  expect(count("M0 5 H5 H10", "M5 0 V10")).toBe(1);
  expect(count("M0 0 L5 5 L10 0", "M0 5 H10")).toBe(0);
  expect(count("M0 0 L5 5 L10 10", "M0 10 L5 5 L10 0")).toBe(1);
});

test("the comparison page uses the library's quality report", () => {
  const { map } = resolvedMaps()[0];
  const metrics = geometryMetrics(map, map);
  expect(metrics.quality).toEqual(check(map, map));
  expect(metrics.crossings).toBe(metrics.quality.crossings.count);
  expect(metrics.hard).toBe(metrics.quality.hard);
  expect(metrics.area).toBe(map.viewBox[0] * map.viewBox[1]);
});
