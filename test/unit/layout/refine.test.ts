import { expect, test } from "vitest";
import { test as property, fc } from "@fast-check/vitest";
import { readFileSync } from "node:fs";
import {
  ResolvedMapSchema,
  SourceMapSchema,
  type ResolvedMap,
} from "../../../src/schema";
import {
  layout,
  refine,
  check,
  fontTableMeasurer,
} from "../../../src/layout/index";
import { dagreEngine } from "../../../src/layout/dagre";
import { resolvedMaps } from "../fixtures/maps";
import fixture from "../../fixtures/map.json";

const wide = { name: "wide", measure: () => ({ width: 40, height: 24 }) };
const fixed = { name: "fixed", measure: () => ({ width: 20, height: 12 }) };
const source = (name: string) =>
  SourceMapSchema.parse(
    JSON.parse(readFileSync(`examples/${name}/map.json`, "utf8")),
  );

test("records the measurer, retaining legacy functions and hand-drawn maps", async () => {
  const map = await layout(source("coffee"), dagreEngine, {
    measureLabel: fixed,
  });
  expect(map.measurement?.name).toBe("fixed");
  expect(Object.values(map.measurement!.labels)).toContainEqual({
    width: 20,
    height: 12,
  });
  expect((await layout(source("coffee"), dagreEngine)).measurement?.name).toBe(
    "font-table",
  );
  expect(
    (
      await layout(source("coffee"), dagreEngine, {
        measureLabel: fixed.measure,
      })
    ).measurement?.name,
  ).toBe("custom");
  expect((await layout(fixture, dagreEngine)).measurement).toBeUndefined();
});

test("preserves custom label centres across refinement and serialization", () => {
  const map = ResolvedMapSchema.parse(fixture);
  map.edges.ab.label = { text: "go", at: [70, 74] };
  map.measurement = {
    name: "fixed",
    labels: { ab: { width: 20, height: 12 } },
  };
  const result = refine(map, wide);
  expect(result.edges.ab.label!.at).toEqual([60, 78]);
  expect(refine(JSON.parse(JSON.stringify(result)), wide)).toEqual(result);
  expect(map.edges.ab.label.at).toEqual([70, 74]);
});

test("moves numbers off boxes, including repeated passes, but leaves clear numbers", () => {
  const map = ResolvedMapSchema.parse(fixture);
  map.edges.ab.badge = [35, 25];
  map.scenarios[0].repeatBadges![0].at = [35, 115];
  expect(
    check(map, map).steps.boxes.filter((c) => c.band === "defect"),
  ).toHaveLength(2);
  const result = refine(map, fixed);
  expect(
    check(map, result).steps.boxes.filter((c) => c.band === "defect"),
  ).toEqual([]);
  expect(
    refine(ResolvedMapSchema.parse(fixture), fixed).edges.ab.badge,
  ).toEqual([35, 70]);
});

test("moves a number that covers measured text and rejects invalid sizes", () => {
  const map = ResolvedMapSchema.parse(fixture);
  map.edges.ab.label = { text: "go", at: [25, 74] };
  map.measurement = {
    name: "fixed",
    labels: { ab: { width: 20, height: 12 } },
  };
  const result = refine(map, wide);
  expect(result.edges.ab.badge).not.toEqual(map.edges.ab.badge);
  expect(
    check(map, result, { measureLabel: wide }).steps.labels.filter(
      (c) => c.band === "defect",
    ),
  ).toEqual([]);
  expect(() =>
    refine(map, {
      name: "broken",
      measure: () => ({ width: NaN, height: 12 }),
    }),
  ).toThrow(/measurement/);
});

const book = resolvedMaps().map(({ map }) => map);
const examples = await Promise.all(
  ["coffee", "door", "gcd"].map((name) => layout(source(name), dagreEngine)),
);
function fixedGeometry(map: ResolvedMap) {
  return JSON.stringify({
    nodes: map.nodes,
    lanes: map.lanes,
    frames: map.frames,
    viewBox: map.viewBox,
    paths: Object.values(map.edges).map((e) => e.path),
  });
}
property.prop([
  fc.constantFrom(...book, ...examples),
  fc.double({ min: 0.5, max: 2, noNaN: true }),
])(
  "refinement is pure and keeps boxes, lanes, frames, paths and the view box",
  (map, scale) => {
    const before = JSON.stringify(map);
    const measurer = {
      name: "scaled",
      measure: (
        text: string,
        style: Parameters<typeof fontTableMeasurer.measure>[1],
      ) => {
        const size = fontTableMeasurer.measure(text, style);
        return { width: size.width * scale, height: size.height * scale };
      },
    };
    const result = refine(map, measurer);
    expect(fixedGeometry(result)).toBe(fixedGeometry(map));
    expect(JSON.stringify(map)).toBe(before);
    expect(refine(map, measurer)).toEqual(result);
  },
);

test("layout keeps custom ink offsets so the same measurement does not move a label", async () => {
  const ink = {
    name: "ink",
    measure: () => ({ width: 20, height: 12, left: -2, ascent: 9 }),
  };
  const map = await layout(source("coffee"), dagreEngine, {
    measureLabel: ink,
  });
  const next = refine(map, ink);
  for (const [id, edge] of Object.entries(map.edges))
    expect(next.edges[id].label?.at).toEqual(edge.label?.at);
});

test.each([...book, ...examples].map((map) => [map.id, map] as const))(
  "preserves every fixed coordinate in %s",
  (_id, map) => {
    expect(fixedGeometry(refine(map, wide))).toBe(fixedGeometry(map));
  },
);

test("a number with a clear gap to a box stays put", () => {
  const map = ResolvedMapSchema.parse(fixture);
  map.edges.ab.badge = [35, 49]; // box ends at 40, number radius is 8
  expect(refine(map, fixed).edges.ab.badge).toEqual([35, 49]);
});

test.each([
  { ascent: NaN },
  { left: Infinity },
  { padding: -1 },
  { wrap: { lines: ["go"], lineHeight: 0 } },
])("rejects invalid optional text metrics: %j", (extra) => {
  const map = ResolvedMapSchema.parse(fixture);
  map.edges.ab.label = { text: "go", at: [70, 74] };
  expect(() =>
    refine(map, {
      name: "invalid",
      measure: () => ({ width: 20, height: 12, ...extra }),
    }),
  ).toThrow(/measurement/);
});
