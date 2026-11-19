import { expect, test } from "vitest";
import { SourceMapSchema, ResolvedMapSchema } from "../../../src/schema";
import {
  layout,
  check,
  refine,
  fontTableMeasurer,
} from "../../../src/layout/index";
import { buildProblem } from "../../../src/layout/build-problem";
import { measureLabel } from "../../../src/layout/measure";
import { dagreEngine } from "../../../src/layout/dagre";
import { elkEngine } from "../../../src/layout/elk";

const hint = { kind: "side", edge: "ab", end: "from", side: "right" };
function source(hints: unknown[] = [hint]) {
  return SourceMapSchema.parse({
    format: 3,
    id: "sides",
    title: "Sides",
    layers: { service: { label: "Service" } },
    nodes: {
      a: { label: "A", layer: "service" },
      b: { label: "B", layer: "service" },
    },
    edges: { ab: { from: "a", to: "b" } },
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
    layout: { hints },
  });
}
function drawing(path = "M60 25 H150") {
  const map = source();
  return ResolvedMapSchema.parse({
    ...map,
    viewBox: [300, 200],
    nodes: {
      a: { ...map.nodes.a, box: [10, 10, 50, 30] },
      b: { ...map.nodes.b, box: [150, 10, 50, 30] },
    },
    edges: { ab: { ...map.edges.ab, path } },
  });
}

test("side hints default to preferred and reach placement in source order", () => {
  const map = source([
    hint,
    { ...hint, end: "to", side: "left", strength: "required" },
  ]);
  expect(map.layout?.hints[0]).toEqual({ ...hint, strength: "preferred" });
  expect(source([{ ...hint, strength: "preferred" }])).toEqual(source());
  expect(buildProblem(map, measureLabel, false).constraints.slice(-2)).toEqual([
    {
      ...hint,
      strength: "preferred",
      origin: "stated",
      path: "layout.hints[0]",
    },
    {
      ...hint,
      end: "to",
      side: "left",
      strength: "required",
      origin: "stated",
      path: "layout.hints[1]",
    },
  ]);
});

test.each([
  { ...hint, edge: "bad id" },
  { ...hint, edge: undefined },
  { ...hint, end: "start" },
  { ...hint, side: "north" },
  { ...hint, side: undefined },
  { ...hint, strength: "optional" },
  { ...hint, typo: true },
])("reject malformed side hint: %j", (invalid) => {
  expect(() => source([invalid])).toThrow();
});

for (const engine of [dagreEngine, elkEngine]) {
  test(`${engine.name}: list unsupported preferred sides without changing geometry`, async () => {
    const map = source(),
      unsupported: unknown[] = [];
    const plain = { ...map };
    delete plain.layout;
    const resolved = await layout(map, engine, {
      onUnsupportedHints: (hints) => unsupported.push(...hints),
    });
    expect(resolved).toEqual({
      ...(await layout(plain, engine)),
      layout: map.layout,
    });
    expect(unsupported).toEqual([
      {
        ...hint,
        strength: "preferred",
        origin: "stated",
        path: "layout.hints[0]",
      },
    ]);
  });
  test(`${engine.name}: refuse required sides naming path, edge and end`, async () => {
    await expect(
      layout(source([{ ...hint, strength: "required" }]), engine),
    ).rejects.toMatchObject({
      kind: "unsupported-constraints",
      message: expect.stringMatching(
        /layout\.hints\[0\].*side.*ab.*from.*right/s,
      ),
    });
  });
}

test("unknown hint edges fail before measurement or placement", async () => {
  let called = false;
  await expect(
    layout(source([{ ...hint, edge: "missing" }]), dagreEngine, {
      measureLabel: () => {
        called = true;
        throw new Error("must not measure");
      },
    }),
  ).rejects.toThrow(/layout\.hints\[0\]\.edge.*missing/);
  expect(called).toBe(false);
});

test("contradictory required sides name both hints before placement", async () => {
  const map = source([
    { ...hint, strength: "required" },
    { ...hint, side: "left", strength: "required" },
  ]);
  await expect(layout(map, dagreEngine)).rejects.toThrow(
    /contradict.*layout\.hints\[0\].*layout\.hints\[1\].*ab.*from/is,
  );
});

for (const [side, fromPath, toPath] of [
  ["top", "M35 10 V0", "M175 0 V10"],
  ["right", "M60 25 H100", "M220 25 H200"],
  ["bottom", "M35 40 V60", "M175 60 V40"],
  ["left", "M10 25 H0", "M100 25 H150"],
])
  for (const end of ["from", "to"]) {
    test(`${side} ${end}: check the source hint against the actual path endpoint`, () => {
      const map = source([{ ...hint, side, end, strength: "required" }]);
      const resolved = drawing(end === "from" ? fromPath : toPath);
      delete resolved.layout;
      expect(check(map, resolved).constraints[0]).toMatchObject({
        kind: "side",
        side,
        end,
        holds: true,
        origin: "stated",
        path: "layout.hints[0]",
      });
      resolved.nodes[end === "from" ? "a" : "b"].box[0] += 100;
      expect(check(map, resolved).constraints[0].holds).toBe(false);
    });
  }

test.each([
  "M60 5 H100",
  "M59 25 H100",
  "M61 25 H100",
  "M60 25",
  "M60 25 H100 M110 25 H150",
])("reject a detached, outside or discontinuous endpoint: %s", (path) => {
  expect(check(source(), drawing(path)).constraints[0].holds).toBe(false);
});

test("check both ends of a self-loop independently", () => {
  const map = source([hint, { ...hint, end: "to", side: "top" }]);
  map.edges.ab.to = map.edges.ab.from;
  const resolved = drawing("M60 25 H80 V0 H35 V10");
  resolved.edges.ab.to = resolved.edges.ab.from;
  expect(check(map, resolved).constraints.map((c) => c.holds)).toEqual([
    true,
    true,
  ]);
  resolved.edges.ab.path = "M60 25 H80 V0 H35 V9";
  expect(check(map, resolved).constraints.map((c) => c.holds)).toEqual([
    true,
    false,
  ]);
});

test("missed required sides are hard defects; preferred sides are descriptive", () => {
  const resolved = drawing("M35 40 V80 H175 V40");
  expect(check(source(), resolved).hard).toBe(0);
  expect(
    check(source([{ ...hint, strength: "required" }]), resolved),
  ).toMatchObject({ hard: 1, constraints: [{ holds: false }] });
});

test("hand geometry and refinement retain side metadata without enforcing it", async () => {
  const map = drawing();
  map.layout = source([{ ...hint, side: "left", strength: "required" }]).layout;
  expect(await layout(map, dagreEngine)).toEqual(map);
  const refined = refine(map, fontTableMeasurer);
  expect(refined.nodes).toEqual(map.nodes);
  expect(refined.edges.ab.path).toBe(map.edges.ab.path);
  expect(refined.layout).toEqual(map.layout);
  expect(check(map, refined).constraints[0].holds).toBe(false);
});

test("a claimed required side is checked even without strict layout", async () => {
  const engine = {
    ...dagreEngine,
    capabilities: { ...dagreEngine.capabilities, side: "required" as const },
  };
  await expect(
    layout(source([{ ...hint, strength: "required" }]), engine),
  ).rejects.toMatchObject({
    kind: "result-rejected",
    constraint: "side",
    message: expect.stringMatching(/layout\.hints\[0\].*ab/),
  });
});

test("hand geometry keeps conflicting required side hints as metadata", async () => {
  const map = drawing();
  map.layout = source([
    { ...hint, strength: "required" },
    { ...hint, side: "left", strength: "required" },
  ]).layout;
  expect(await layout(map, dagreEngine)).toEqual(map);
  expect(check(map, map).constraints.map((c) => c.holds)).toEqual([
    true,
    false,
  ]);
});

test.each([
  ["M100 25 H149.99999995 H150", true],
  ["M100 25 H150 H149.99999995", false],
])("judge the exact endpoint after a tiny segment: %s", (path, holds) => {
  const map = source([{ ...hint, end: "to", side: "left" }]);
  expect(check(map, drawing(path)).constraints[0].holds).toBe(holds);
});

test("a large x coordinate does not hide an incorrect y boundary", () => {
  const map = source([{ ...hint, side: "top" }]);
  const resolved = drawing("M10000000000000020 15 V0");
  resolved.nodes.a.box = [1e16, 10, 50, 30];
  expect(check(map, resolved).constraints[0].holds).toBe(false);
});
