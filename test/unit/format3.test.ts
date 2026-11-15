import { expect, test } from "vitest";
import { z } from "zod";
import { readFileSync } from "node:fs";
import {
  SourceMapSchema,
  ResolvedMapSchema,
  mapSchema,
} from "../../src/schema";
import {
  renderPanel,
  renderConcepts,
  renderDeeper,
  renderSvg,
  derive,
  initialState,
} from "../../src/index";
import { resolvedFixture } from "./fixtures/map";

const coffee = () => ({
  format: 3,
  id: "coffee-shop",
  title: "Coffee shop",
  layers: { service: { label: "Service" } },
  nodes: { guest: { label: "Guest", layer: "service" } },
  scenarios: [
    {
      id: "normal",
      label: "Normal",
      steps: [
        {
          id: "order",
          title: "Order",
          text: "Ask for **coffee**",
          show: ["guest"],
        },
      ],
    },
  ],
});

test("source maps need no geometry, lanes or empty optional collections", () => {
  const map = SourceMapSchema.parse(coffee());
  expect(map).toMatchObject({
    lanes: {},
    frames: {},
    edges: {},
    definitions: {},
    code: {},
    concepts: [],
    callouts: {},
    deeper: [],
  });
  expect(map.scenarios[0].display.edges).toBe("progressive");
  expect(map.scenarios[0].steps[0]).toMatchObject({
    current: [],
    edges: [],
    defs: [],
    sources: [],
    deeper: [],
  });
  expect(map).not.toHaveProperty("viewBox");
  expect(map.nodes.guest).not.toHaveProperty("box");
  expect(map.nodes.guest).not.toHaveProperty("lane");
});

test("resolved maps require geometry and reject format 2", () => {
  expect(ResolvedMapSchema.safeParse(coffee()).success).toBe(false);
  const resolved = {
    ...coffee(),
    viewBox: [200, 100],
    nodes: { guest: { ...coffee().nodes.guest, box: [10, 10, 60, 30] } },
  };
  const map = ResolvedMapSchema.parse(resolved);
  expect(renderSvg(map)).toContain("--cmap-layer-service");
  expect(renderPanel(map, derive(map, initialState))).toContain(
    "<strong>coffee</strong>",
  );
  expect(ResolvedMapSchema.safeParse({ ...resolved, format: 2 }).success).toBe(
    false,
  );
  expect(SourceMapSchema.safeParse({ ...coffee(), format: 2 }).success).toBe(
    false,
  );
});

test("source schema rejects geometry instead of silently discarding it", () => {
  expect(
    SourceMapSchema.safeParse({ ...coffee(), viewBox: [200, 100] }).success,
  ).toBe(false);
  expect(
    SourceMapSchema.safeParse({
      ...coffee(),
      nodes: { guest: { ...coffee().nodes.guest, box: [0, 0, 10, 10] } },
    }).success,
  ).toBe(false);
  expect(
    SourceMapSchema.safeParse({
      ...coffee(),
      edges: { order: { from: "guest", to: "guest", path: "M0 0L1 1" } },
    }).success,
  ).toBe(false);
});

test("layer names are map-owned identifiers and undeclared layers are rejected", () => {
  expect(SourceMapSchema.safeParse(coffee()).success).toBe(true);
  expect(SourceMapSchema.safeParse({ ...coffee(), layers: {} }).success).toBe(
    false,
  );
  expect(
    SourceMapSchema.safeParse({
      ...coffee(),
      layers: { "bad;style": { label: "Bad" } },
    }).success,
  ).toBe(false);
  const map = resolvedFixture();
  delete map.layers.client;
  expect(ResolvedMapSchema.safeParse(map).success).toBe(false);
});

test("source edge labels are text; resolved labels retain their positions", () => {
  const map = coffee();
  expect(
    SourceMapSchema.parse({
      ...map,
      edges: { order: { from: "guest", to: "guest", label: "orders" } },
    }).edges.order.label,
  ).toBe("orders");
  const resolved = resolvedFixture();
  resolved.edges.ab.label = { text: "orders", at: [30, 40] };
  expect(ResolvedMapSchema.parse(resolved).edges.ab.label?.at).toEqual([
    30, 40,
  ]);
});

test("shared kernel still specializes text and link leaves", () => {
  const kernel = mapSchema({
    text: z.number(),
    source: z.string(),
    deeper: z.string(),
  });
  expect(kernel.shape.format.value).toBe(3);
  expect(
    kernel.shape.scenarios.element.shape.steps.element.shape.text.safeParse(1)
      .success,
  ).toBe(true);
});

test("every rich leaf renders inline text and escapes HTML exactly once", () => {
  const map = resolvedFixture();
  const value = '**bold** *em* `code` <img src="x"> &';
  const rendered =
    "<strong>bold</strong> <em>em</em> <code>code</code> &lt;img src=&quot;x&quot;&gt; &amp;";
  map.scenarios[0].steps[0].text = value;
  map.scenarios[0].steps[0].fix = value;
  map.definitions.call.text = value;
  map.scenarios[0].whole = { text: value };
  map.concepts[0].items[0].short = value;
  map.deeper[0].why = value;
  const stepPanel = renderPanel(map, derive(map, initialState));
  expect(stepPanel.split(rendered)).toHaveLength(4); // text, fix and definition
  for (const html of [
    stepPanel,
    renderPanel(map, derive(map, { ...initialState, mode: "all" })),
    renderConcepts(map),
    renderDeeper(map),
  ]) {
    expect(html).toContain(rendered);
    expect(html).not.toContain("<img");
    expect(html).not.toContain("&amp;lt;");
  }
});

test("both committed JSON Schemas describe author input including defaults", () => {
  for (const [name, schema] of [
    ["source", SourceMapSchema],
    ["resolved", ResolvedMapSchema],
  ] as const) {
    expect(JSON.parse(readFileSync(`${name}-map.schema.json`, "utf8"))).toEqual(
      z.toJSONSchema(schema, { target: "draft-2020-12", io: "input" }),
    );
  }
});

test("concepts can omit a source and use the first scenario by default", () => {
  const map = resolvedFixture();
  delete map.conceptScenario;
  delete map.concepts[0].items[0].source;
  const html = renderConcepts(ResolvedMapSchema.parse(map));
  expect(html).toContain('data-step="0"');
  expect(html).not.toContain("Source ↗");
});

test("undeclared lane and concept layers have precise validation paths", () => {
  for (const field of ["lanes", "concepts"] as const) {
    const map = resolvedFixture();
    if (field === "lanes") map.lanes.client.layer = "missing";
    else map.concepts[0].layer = "missing";
    const result = ResolvedMapSchema.safeParse(map);
    expect(result.success).toBe(false);
    if (!result.success)
      expect(result.error.issues[0].path).toEqual([
        field,
        field === "lanes" ? "client" : 0,
        "layer",
      ]);
  }
});
