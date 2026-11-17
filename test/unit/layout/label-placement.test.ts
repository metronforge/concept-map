import { expect, test } from "vitest";
import { readFileSync } from "node:fs";
import {
  layout,
  refine,
  check,
  fontTableMeasurer,
} from "../../../src/layout/index";
import { dagreEngine } from "../../../src/layout/dagre";
import { ResolvedMapSchema } from "../../../src/schema";
import { labelCost } from "../../../src/layout/stages/label-candidates";
import fixture from "../../fixtures/map.json";

test.each(["coffee", "door"])(
  "%s labels clear lines without changing routes or fixed geometry",
  async (name) => {
    const source = JSON.parse(
      readFileSync(`examples/${name}/map.json`, "utf8"),
    );
    const map = await layout(source, dagreEngine);
    expect(
      check(map, map).labels.lines.filter((c) => c.band === "defect"),
    ).toEqual([]);
    expect(refine(map, fontTableMeasurer)).toEqual(map);
  },
);

test("hand-drawn labels crossed by lines move to clear positions", () => {
  const map = ResolvedMapSchema.parse(fixture);
  map.edges.ab.label = { text: "go", at: [25, 64] };
  const before = JSON.stringify(map);
  expect(check(map, map).labels.lines.some((c) => c.band === "defect")).toBe(
    true,
  );
  const result = refine(map, fontTableMeasurer);
  expect(check(map, result).hard).toBe(0);
  expect(result.edges.ab.path).toBe(map.edges.ab.path);
  for (const field of ["nodes", "lanes", "frames", "viewBox"] as const)
    expect(result[field]).toEqual(map[field]);
  expect(JSON.stringify(map)).toBe(before);
  expect(refine(result, fontTableMeasurer)).toEqual(result);
});

test("a label prefers its own arrow even when another arrow is nearer its old position", () => {
  const own = [
    [
      [0, 20],
      [100, 20],
    ],
  ] as const;
  const other = [
    [
      [0, 80],
      [100, 80],
    ],
  ] as const;
  const origin = [20, 70, 20, 10] as [number, number, number, number];
  const nearbyOther = labelCost(
    [20, 66, 20, 10],
    origin,
    [...own],
    [...other],
    150,
  );
  const besideOwn = labelCost(
    [20, 6, 20, 10],
    origin,
    [...own],
    [...other],
    150,
  );
  expect(besideOwn).toBeLessThan(nearbyOther);
});
