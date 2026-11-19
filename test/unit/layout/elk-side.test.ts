import { expect, test } from "vitest";
import { SourceMapSchema } from "../../../src/schema";
import {
  layout,
  check,
  refine,
  fontTableMeasurer,
} from "../../../src/layout/index";
import { elkEngine } from "../../../src/layout/elk";

const sides = ["top", "right", "bottom", "left"] as const;
function source(
  from: string,
  to: string,
  loop = false,
  strength = "required",
  direction = "down",
) {
  return SourceMapSchema.parse({
    format: 3,
    id: "ports",
    title: "Ports",
    direction,
    layers: { service: { label: "Service" } },
    nodes: {
      a: { label: "A", layer: "service" },
      b: { label: "B", layer: "service" },
    },
    edges: { ab: { from: "a", to: loop ? "a" : "b", label: "Send" } },
    scenarios: [
      {
        id: "all",
        label: "All",
        steps: [
          {
            id: "show",
            title: "Show",
            text: "",
            show: ["a", "b"],
            edges: ["ab"],
          },
        ],
      },
    ],
    layout: {
      hints: [
        { kind: "side", edge: "ab", end: "from", side: from, strength },
        { kind: "side", edge: "ab", end: "to", side: to, strength },
      ],
    },
  });
}

for (const direction of ["down", "right"])
  for (const loop of [false, true])
    for (const from of sides)
      for (const to of sides)
        test(`${direction} ${loop ? "loop" : "arrow"} ${from} to ${to}: honour both required sides`, async () => {
          const map = source(from, to, loop, "required", direction);
          const resolved = await layout(map, elkEngine);
          expect(check(map, resolved).constraints.map((c) => c.holds)).toEqual([
            true,
            true,
          ]);
          expect(
            check(map, refine(resolved, fontTableMeasurer)).constraints.map(
              (c) => c.holds,
            ),
          ).toEqual([true, true]);
        });

test("preferred sides change the drawing without unsupported diagnostics", async () => {
  const map = source("left", "top", false, "preferred");
  const plain = { ...map, layout: undefined };
  const unsupported: unknown[] = [];
  const resolved = await layout(map, elkEngine, {
    onUnsupportedHints: (hints) => unsupported.push(...hints),
  });
  expect(unsupported).toEqual([]);
  expect(check(map, resolved).constraints.map((c) => c.holds)).toEqual([
    true,
    true,
  ]);
  expect(resolved.edges.ab.path).not.toBe(
    (await layout(plain, elkEngine)).edges.ab.path,
  );
});

test("stated sides retain original ends when scenario intent reverses a return", async () => {
  const map = source("left", "top");
  map.edges.ab.from = "b" as typeof map.edges.ab.from;
  map.edges.ab.to = "a" as typeof map.edges.ab.to;
  map.scenarios[0].steps[0].edges = [];
  const resolved = await layout(map, elkEngine);
  expect(check(map, resolved).constraints.map((c) => c.holds)).toEqual([
    true,
    true,
  ]);
});

test("required sides override conflicting preferred sides in either source order", async () => {
  for (const requiredFirst of [false, true]) {
    const map = source("left", "top");
    const preferred = {
      ...map.layout!.hints[0],
      side: "right" as const,
      strength: "preferred" as const,
    };
    map.layout!.hints.splice(requiredFirst ? 1 : 0, 0, preferred);
    const report = check(map, await layout(map, elkEngine));
    expect(
      report.constraints
        .filter((c) => c.strength === "required")
        .every((c) => c.holds),
    ).toBe(true);
    expect(
      report.constraints.find((c) => c.strength === "preferred")?.holds,
    ).toBe(false);
  }
});

test("side ports preserve required lanes and work without derived intent", async () => {
  const map = SourceMapSchema.parse({
    ...source("left", "top"),
    lanes: {
      first: { label: "First", layer: "service" },
      second: { label: "Second", layer: "service" },
    },
  });
  map.nodes.a.lane = "first";
  map.nodes.b.lane = "second";
  const report = check(map, await layout(map, elkEngine, { intent: false }));
  expect(report.constraints.map((c) => c.holds)).toEqual([true, true, true]);
});

for (const loop of [false, true])
  for (const end of ["from", "to"])
    for (const side of sides)
      test(`${loop ? "loop" : "arrow"}: honour a single ${end} ${side} hint`, async () => {
        const map = source(side, side, loop);
        map.layout!.hints = map.layout!.hints.filter(
          (hint) => hint.kind === "side" && hint.end === end,
        );
        expect(
          check(map, await layout(map, elkEngine)).constraints.map(
            (c) => c.holds,
          ),
        ).toEqual([true]);
      });
