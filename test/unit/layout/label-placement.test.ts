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

test("a crossed label uses a clear slot along the drawing boundary", () => {
  const map = ResolvedMapSchema.parse(fixture);
  map.viewBox = [657, 120];
  map.nodes.a.box = [0, 0, 77, 120];
  map.nodes.b.box = [77, 32, 580, 88];
  map.nodes.c = { ...map.nodes.b, box: [247, 0, 410, 32] };
  map.edges.ab.path = "M77 60 H657";
  delete map.edges.ab.badge;
  map.scenarios[0].repeatBadges = [];
  map.edges.ab.label = { text: "out of milk", at: [395, 75] };
  const size = { width: 157, height: 28, ascent: 22, padding: 2 };
  map.measurement = { name: "measured", labels: { ab: size } };
  const measurer = { name: "measured", measure: () => size };
  const before = JSON.stringify(map);
  const result = refine(map, measurer);
  const [x, y] = result.edges.ab.label!.at;
  expect(x).toBeGreaterThan(77);
  expect(x + size.width).toBeLessThan(247);
  expect(y - size.ascent).toBeGreaterThanOrEqual(size.padding);
  expect(y - size.ascent + size.height).toBeLessThan(32);
  expect(
    check(map, result, { measureLabel: measurer }).labels.boxes.filter(
      (contact) => contact.band === "defect",
    ),
  ).toEqual([]);
  expect(result.edges.ab.path).toBe(map.edges.ab.path);
  expect(result.nodes).toEqual(map.nodes);
  expect(result.viewBox).toEqual(map.viewBox);
  expect(JSON.stringify(map)).toBe(before);
  expect(refine(result, measurer)).toEqual(result);
});
