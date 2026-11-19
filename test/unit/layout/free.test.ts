import { expect, test } from "vitest";
import { SourceMapSchema, ResolvedMapSchema } from "../../../src/schema";
import {
  layout,
  check,
  describeDefects,
  refine,
  fontTableMeasurer,
} from "../../../src/layout/index";
import { buildProblem } from "../../../src/layout/build-problem";
import { measureLabel } from "../../../src/layout/measure";
import { dagreEngine } from "../../../src/layout/dagre";
import { elkEngine } from "../../../src/layout/elk";
import { asPlacer } from "../../../src/layout/legacy";
import { place } from "../../../src/layout/place";

const hint = { kind: "free", edge: "ab" };
function source(hints: unknown[] = [hint]) {
  return SourceMapSchema.parse({
    format: 3,
    id: "free",
    title: "Free arrow",
    direction: "right",
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
function drawing(hints: unknown[] = [hint]) {
  const map = source(hints);
  return ResolvedMapSchema.parse({
    ...map,
    viewBox: [300, 200],
    nodes: {
      a: { ...map.nodes.a, box: [10, 10, 50, 30] },
      b: { ...map.nodes.b, box: [150, 10, 50, 30] },
    },
    edges: { ab: { ...map.edges.ab, path: "M60 25 H150" } },
  });
}

test("free hints default to preferred and retain source order even without derived intent", () => {
  const map = source([hint, { ...hint, strength: "required" }]);
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
      strength: "required",
      origin: "stated",
      path: "layout.hints[1]",
    },
  ]);
});

test.each([
  { ...hint, edge: undefined },
  { ...hint, edge: "bad id" },
  { ...hint, strength: "optional" },
  { ...hint, strength: null },
  { ...hint, end: "from" },
])("reject malformed free hint: %j", (invalid) => {
  expect(() => source([invalid])).toThrow();
});

test("unknown free edges fail before measurement or placement", async () => {
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

for (const engine of [dagreEngine, elkEngine]) {
  test(`${engine.name}: lists literal rank exclusion as unsupported`, async () => {
    // Bypass format parsing here so the test catches today's misleading capability.
    const map = source([]);
    const problem = buildProblem(map, measureLabel);
    const result = await place(
      {
        ...problem,
        constraints: [
          ...problem.constraints,
          {
            kind: "free",
            edge: "ab",
            strength: "preferred",
            origin: "stated",
            path: "layout.hints[0]",
          },
        ],
      },
      asPlacer(engine),
    );
    expect(result).toMatchObject({
      kind: "placed",
      unsupported: [
        expect.objectContaining({ kind: "free", edge: "ab", origin: "stated" }),
      ],
    });
  });
  for (const intent of [true, false])
    test(`${engine.name}: unsupported free hints do not reverse forward arrows, intent=${intent}`, async () => {
      const map = source(),
        unsupported: unknown[] = [];
      const plain = { ...map };
      delete plain.layout;
      const resolved = await layout(map, engine, {
        intent,
        widthEm: 5,
        onUnsupportedHints: (hints) => unsupported.push(...hints),
      });
      expect(resolved).toEqual({
        ...(await layout(plain, engine, { intent, widthEm: 5 })),
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
  test(`${engine.name}: required free hints fail naming path and edge`, async () => {
    await expect(
      layout(source([{ ...hint, strength: "required" }]), engine),
    ).rejects.toMatchObject({
      kind: "unsupported-constraints",
      message: expect.stringMatching(/layout\.hints\[0\].*free.*ab/s),
    });
  });
}

for (const strength of ["preferred", "required"])
  test(`${strength}: rank exclusion is not verifiable from any drawing`, () => {
    const map = source([{ ...hint, strength }]);
    const resolved = drawing([]);
    const report = check(map, resolved);
    expect(report.constraints).toEqual([
      {
        ...hint,
        strength,
        origin: "stated",
        path: "layout.hints[0]",
        holds: null,
        message: expect.stringMatching(
          /layout\.hints\[0\].*free.*ab.*not verifiable from the drawing/s,
        ),
      },
    ]);
    expect(report.hard).toBe(0);
    expect(describeDefects(report)).toEqual([]);
    resolved.nodes.a.box[0] = 250;
    expect(check(map, resolved).constraints[0].holds).toBeNull();
    // Supplied drawing metadata cannot invent source hints.
    expect(check(source([]), drawing()).constraints).toEqual([]);
  });

test("stated free edges count as returns even when the scenario visits a new node", () => {
  const map = source(),
    resolved = drawing([]);
  expect(check(map, resolved).reading).toEqual({
    edges: 1,
    forward: 1,
    share: 1,
    nonReturn: { edges: 0, forward: 0, share: null },
    returns: { edges: 1, backward: 0, share: 0, selfLoops: 0 },
  });
  expect(check(source([]), drawing()).reading.nonReturn.edges).toBe(1);
});

test("required free metadata preserves hand geometry and does not invent a hard defect", async () => {
  const map = drawing([{ ...hint, strength: "required" }]);
  expect(
    await layout(map, dagreEngine, {
      strict: true,
      onUnsupportedHints: () => {
        throw new Error("hand hints are metadata");
      },
    }),
  ).toEqual(map);
  const refined = refine(map, fontTableMeasurer);
  expect(refined.layout).toEqual(map.layout);
  expect(refined.nodes).toEqual(map.nodes);
  expect(refined.edges.ab.path).toBe(map.edges.ab.path);
  expect(check(map, refined).constraints[0].holds).toBeNull();
});

const fixedPlacer = {
  name: "fixed boxes",
  capabilities: { free: "required" as const, side: "required" as const },
  layout: dagreEngine.layout,
  place: async () => ({
    nodes: { a: [10, 10, 100, 60], b: [210, 10, 100, 60] },
    edges: {
      ab: {
        points: [
          [110, 40],
          [210, 40],
        ],
      },
    },
    lanes: {},
  }),
};

test("a supported required free hint is not rejected by the geometric checker", async () => {
  const map = source([{ ...hint, strength: "required" }]);
  const resolved = await layout(map, fixedPlacer, { strict: true });
  expect(check(map, resolved).constraints[0].holds).toBeNull();
});

test("an unverifiable required free hint does not hide a broken required side", async () => {
  const map = source([
    { ...hint, strength: "required" },
    {
      kind: "side",
      edge: "ab",
      end: "from",
      side: "left",
      strength: "required",
    },
  ]);
  await expect(layout(map, fixedPlacer)).rejects.toMatchObject({
    kind: "result-rejected",
    constraint: "side",
    message: expect.stringContaining("layout.hints[1]"),
  });
});
