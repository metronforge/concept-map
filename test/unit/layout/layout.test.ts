import { expect, test, vi } from "vitest";
import { test as property, fc } from "@fast-check/vitest";
import {
  layout,
  measureLabel,
  validateReferences,
} from "../../../src/layout/index";
import { dagreEngine } from "../../../src/layout/dagre";
import { elkEngine } from "../../../src/layout/elk";
import { SourceMapSchema, ResolvedMapSchema } from "../../../src/schema";
import { resolvedMaps } from "../fixtures/maps";
import { sourceFixture } from "./fixture";
import type { LayoutEngine } from "../../../src/layout/types";

for (const [name, engine] of [
  ["dagre", dagreEngine],
  ["elk", elkEngine],
] as const) {
  test(`${name}: Object prototype names are valid IDs`, async () => {
    const source = sourceFixture();
    source.nodes = {
      constructor: { label: "A", layer: "client" },
      toString: { label: "B", layer: "client" },
    };
    source.edges = {
      hasOwnProperty: { from: "constructor", to: "toString", label: "route" },
    };
    source.frames = {};
    source.scenarios = [
      {
        id: "s",
        label: "S",
        display: source.scenarios[0].display,
        steps: [
          {
            ...source.scenarios[0].steps[0],
            show: ["constructor"],
            current: [],
            edges: ["hasOwnProperty"],
            defs: [],
          },
        ],
      },
    ];
    delete source.conceptScenario;
    source.concepts = [];
    source.callouts = {};
    const result = await layout(source, engine);
    expect(Object.keys(result.nodes)).toEqual(["constructor", "toString"]);
  });
  test(`${name}: empty edge labels remain valid`, async () => {
    const source = sourceFixture();
    source.edges.ab.label = "";
    const result = await layout(source, engine);
    expect(result.edges.ab.label?.text).toBe("");
  });
  test(`${name}: geometry, labels, frames, lanes, badges and source immutability`, async () => {
    const source = sourceFixture();
    source.edges.ab.label = "orders coffee";
    source.nodes.b.lane = undefined;
    source.lanes.empty = { label: "Empty lane", layer: "client" };
    source.scenarios[0].nodeLabels = {
      a: "A much longer scenario-specific label",
    };
    const before = structuredClone(source);
    const map = await layout(source, engine);
    expect(ResolvedMapSchema.safeParse(map).success).toBe(true);
    expect(source).toEqual(before);
    expect(map.nodes.a.box[2]).toBeGreaterThan(
      measureLabel(source.scenarios[0].nodeLabels.a, {
        fontSize: 12.5,
        mono: false,
      }).width,
    );
    expect(map.edges.ab.path).toMatch(/^M.*L/);
    expect(map.edges.ab.label?.text).toBe("orders coffee");
    expect(map.scenarios[0].repeatBadges![0].at).toEqual(map.edges.ab.badge);
    expect(map.frames.outer.box[0]).toBeLessThan(map.nodes.a.box[0]);
    expect(map.lanes.empty.y).toBeGreaterThanOrEqual(
      map.lanes.client.y + map.lanes.client.h,
    );
    expect(map.nodes.b.box[1]).toBeGreaterThan(map.lanes.empty.y);
    expect(await layout(source, engine)).toEqual(map);
  });

  property.prop(
    [
      fc.integer({ min: 1, max: 5 }),
      fc.boolean(),
      fc.boolean(),
      fc.string({ maxLength: 24 }),
      fc.constantFrom("down", "right"),
    ],
    {
      numRuns: 40,
    },
  )(
    `I10 ${name}: deterministic, schema-valid, reference-valid layout`,
    async (count, lanes, cycle, label, direction) => {
      const nodes = Object.fromEntries(
        Array.from({ length: count }, (_, i) => [
          `n${i}`,
          {
            label: `Node ${i}`,
            layer: "service",
            ...(lanes ? { lane: `l${i % 2}` } : {}),
          },
        ]),
      );
      const edges = Object.fromEntries(
        Array.from({ length: Math.max(0, count - 1) }, (_, i) => [
          `e${i}`,
          { from: `n${i}`, to: `n${i + 1}`, label },
        ]),
      );
      if (cycle) edges.loop = { from: `n${count - 1}`, to: "n0", label };
      const source = SourceMapSchema.parse({
        format: 3,
        id: "generated",
        direction,
        title: "Generated",
        layers: { service: { label: "Service" } },
        nodes,
        edges,
        lanes: lanes
          ? {
              l0: { label: "First", layer: "service" },
              l1: { label: "Second", layer: "service" },
            }
          : {},
        scenarios: [
          {
            id: "normal",
            label: "Normal",
            steps: [
              {
                id: "start",
                title: "Start",
                text: "",
                show: Object.keys(nodes),
                edges: Object.keys(edges),
              },
            ],
          },
        ],
      });
      const a = await layout(source, engine),
        b = await layout(source, engine);
      expect(a).toEqual(b);
      expect(ResolvedMapSchema.safeParse(a).success).toBe(true);
      expect(() => validateReferences(a)).not.toThrow();
      for (const n of Object.values(a.nodes)) {
        expect(n.box[0]).toBeGreaterThanOrEqual(0);
        expect(n.box[1]).toBeGreaterThanOrEqual(0);
        expect(n.box[0] + n.box[2]).toBeLessThanOrEqual(a.viewBox[0]);
        expect(n.box[1] + n.box[3]).toBeLessThanOrEqual(a.viewBox[1]);
      }
    },
  );
  test(`${name}: empty graph, self-loops, parallel edges and shared node/edge ids`, async () => {
    const source = sourceFixture();
    source.edges.a = { from: "a", to: "a", label: "self" };
    source.edges.parallel = { from: "a", to: "b" };
    const map = await layout(source, engine);
    expect(Object.keys(map.edges)).toEqual(Object.keys(source.edges));
    const empty = SourceMapSchema.parse({
      ...source,
      nodes: {},
      edges: {},
      frames: {},
      concepts: [],
      callouts: {},
      scenarios: [
        {
          id: "empty",
          label: "Empty",
          steps: [{ id: "empty", title: "Empty", text: "" }],
        },
      ],
      conceptScenario: "empty",
    });
    expect(
      ResolvedMapSchema.safeParse(await layout(empty, engine)).success,
    ).toBe(true);
  });
}

test("hand geometry is retained; the known dangling book reference is rejected", async () => {
  const engine = { layout: vi.fn() },
    measure = vi.fn();
  for (const { id, map } of resolvedMaps()) {
    if (id === "2-1") {
      await expect(layout(map, engine)).rejects.toThrow(
        "edges.timeout_outer.to: unknown node “outer”",
      );
      continue;
    }
    expect(await layout(map, engine, { measureLabel: measure })).toEqual(map);
  }
  expect(engine.layout).not.toHaveBeenCalled();
  expect(measure).not.toHaveBeenCalled();
});

test("invalid engine geometry and incomplete results are rejected", async () => {
  const source = sourceFixture();
  const good = await dagreEngine.layout({
    nodes: [
      { id: "a", width: 80, height: 36 },
      { id: "b", width: 80, height: 36 },
    ],
    edges: [{ id: "ab", from: "a", to: "b" }],
    lanes: [],
  });
  const engine: LayoutEngine = { layout: async () => good };
  await expect(layout(source, engine)).rejects.toThrow(
    "layout.lanes: missing id “client”",
  );
  good.nodes.a[0] = NaN;
  await expect(layout(source, engine)).rejects.toThrow("layout.nodes.a[0]");
});

test("measurement failures are rejected before the engine runs", async () => {
  const engine = { layout: vi.fn() };
  await expect(
    layout(sourceFixture(), engine, {
      measureLabel: () => ({ width: NaN, height: 12 }),
    }),
  ).rejects.toThrow("Invalid label measurement");
  expect(engine.layout).not.toHaveBeenCalled();
});
