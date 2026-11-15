import { test, expect } from "vitest";
import { SourceMapSchema } from "../../../src/schema";
import { layout } from "../../../src/layout/index";
import { dagreEngine } from "../../../src/layout/dagre";
import { elkEngine } from "../../../src/layout/elk";
const source = (direction?: string, lanes = false) => ({
  format: 3,
  id: "chain",
  title: "Chain",
  ...(direction ? { direction } : {}),
  layers: { main: { label: "Main" } },
  lanes: lanes
    ? {
        first: { label: "First", layer: "main" },
        second: { label: "Second", layer: "main" },
      }
    : {},
  nodes: {
    a: { label: "Guest", layer: "main", ...(lanes ? { lane: "first" } : {}) },
    b: {
      label: "Cashier",
      layer: "main",
      ...(lanes ? { lane: "second" } : {}),
    },
    c: { label: "Barista", layer: "main" },
  },
  edges: {
    ab: { from: "a", to: "b", label: "Place an order" },
    bc: { from: "b", to: "c", label: "Make coffee" },
  },
  scenarios: [
    {
      id: "normal",
      label: "Normal",
      steps: [
        {
          id: "order",
          title: "Order",
          text: "",
          show: ["a", "b", "c"],
          edges: ["ab", "bc"],
        },
      ],
    },
  ],
});
for (const [name, engine] of [
  ["dagre", dagreEngine],
  ["elk", elkEngine],
] as const) {
  test(`${name}: right orders a chain horizontally, without turning its labels`, async () => {
    for (const lanes of [false, true]) {
      const input = source("right", lanes);
      if (lanes)
        input.lanes = {
          first: {
            label: "A long lane title that must fit above its nodes",
            layer: "main",
          },
          empty: { label: "An empty lane", layer: "main" },
          second: { label: "Second", layer: "main" },
        };
      const map = await layout(input, engine);
      expect(map.nodes.a.box[0] + map.nodes.a.box[2]).toBeLessThan(
        map.nodes.b.box[0],
      );
      expect(map.nodes.b.box[0] + map.nodes.b.box[2]).toBeLessThan(
        map.nodes.c.box[0],
      );
      if (lanes)
        expect(map.lanes.first.x! + map.lanes.first.w!).toBeLessThanOrEqual(
          map.lanes.second.x!,
        );
      if (lanes) {
        expect(map.lanes.first.x! + map.lanes.first.w!).toBeLessThanOrEqual(
          map.lanes.empty.x!,
        );
        expect(map.lanes.empty.x! + map.lanes.empty.w!).toBeLessThanOrEqual(
          map.lanes.second.x!,
        );
      }
      expect(map.direction).toBe("right");
    }
  });
  test(`${name}: absent direction keeps downward layout`, async () => {
    const absent = await layout(source(), engine);
    const explicit = await layout(source("down"), engine);
    expect(absent.nodes).toEqual(explicit.nodes);
    expect(absent.nodes.a.box[1]).toBeLessThan(absent.nodes.b.box[1]);
  });
}
test("ELK returns distinct positions for measured edge labels", async () => {
  const map = await layout(source(), elkEngine);
  expect(map.edges.ab.label!.at).not.toEqual(map.edges.bc.label!.at);
  for (const edge of Object.values(map.edges))
    expect(edge.label!.at[1]).toBeGreaterThan(32);
});
test("direction rejects unrecognised values", () => {
  expect(SourceMapSchema.safeParse(source("left")).success).toBe(false);
});
