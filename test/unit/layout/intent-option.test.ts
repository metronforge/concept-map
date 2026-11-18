import { expect, test } from "vitest";
import { layout } from "../../../src/layout/index";
import { dagreEngine } from "../../../src/layout/dagre";
import { SourceMapSchema, ResolvedMapSchema } from "../../../src/schema";
import fixture from "../../fixtures/map.json";

const source = SourceMapSchema.parse({
  format: 3,
  id: "cycle",
  title: "A cycle starts at A",
  layers: { main: { label: "Main" } },
  nodes: Object.fromEntries(
    ["c", "b", "a"].map((id) => [id, { label: id, layer: "main" }]),
  ),
  edges: {
    ca: { from: "c", to: "a", label: "return to A" },
    ab: { from: "a", to: "b", label: "continue to B" },
    bc: { from: "b", to: "c", label: "continue to C" },
  },
  scenarios: [
    {
      id: "first",
      label: "First",
      steps: [
        {
          id: "all",
          title: "Visit",
          text: "Visit A, B, C",
          show: ["a", "b", "c"],
          edges: ["ab", "bc", "ca"],
        },
      ],
      flow: [
        { node: "a", step: "all" },
        { node: "b", edge: "ab", step: "all" },
        { node: "c", edge: "bc", step: "all" },
      ],
    },
  ],
});

for (const widthEm of [undefined, 5])
  test(`disabling intent restores graph-only placement at width ${widthEm}`, async () => {
    const before = structuredClone(source);
    const legacy = { layout: dagreEngine.layout };
    const without = await layout(source, dagreEngine, {
      intent: false,
      widthEm,
    });
    expect(without).toEqual(await layout(source, legacy, { widthEm }));
    const withIntent = await layout(source, dagreEngine, { widthEm });
    expect(withIntent).not.toEqual(without);
    expect(
      await layout(source, dagreEngine, { intent: true, widthEm }),
    ).toEqual(withIntent);
    expect(withIntent.nodes.a.box[1]).toBeLessThan(withIntent.nodes.b.box[1]);
    expect(withIntent.nodes.b.box[1]).toBeLessThan(withIntent.nodes.c.box[1]);
    expect(source).toEqual(before);
  });

test.each([true, false])(
  "intent=%s preserves hand geometry",
  async (intent) => {
    const engine = {
      layout: async () => {
        throw new Error("hand maps must not reach the engine");
      },
    };
    expect(await layout(fixture, engine, { intent, widthEm: 5 })).toEqual(
      ResolvedMapSchema.parse(fixture),
    );
  },
);
