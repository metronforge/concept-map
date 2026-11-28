import { expect, test } from "vitest";
import { SourceMapSchema } from "../../../src/schema";
import { layout } from "../../../src/layout/index";
import { elkEngine } from "../../../src/layout/elk";

const base = {
  format: 3,
  id: "sketch-order",
  title: "Sketch order",
  direction: "right",
  layers: { service: { label: "Service" } },
  nodes: Object.fromEntries(
    ["start", "upper", "lower", "end"].map((id) => [
      id,
      { label: id, layer: "service" },
    ]),
  ),
  edges: {
    upperIn: { from: "start", to: "upper" },
    lowerIn: { from: "start", to: "lower" },
    upperOut: { from: "upper", to: "end" },
    lowerOut: { from: "lower", to: "end" },
  },
  scenarios: [
    {
      id: "all",
      label: "All",
      steps: [{ id: "show", title: "Show", text: "" }],
    },
  ],
};

test("ELK uses preferred pin centres to order parallel boxes", async () => {
  const map = SourceMapSchema.parse({
    ...base,
    layout: {
      hints: [
        { kind: "pin", node: "upper", at: [200, 250] },
        { kind: "pin", node: "lower", at: [200, 50] },
      ],
    },
  });
  const unsupported: unknown[] = [];
  const resolved = await layout(map, elkEngine, {
    onUnsupportedHints: (hints) => unsupported.push(...hints),
  });
  expect(unsupported).toEqual([]);
  expect(resolved.nodes.lower.box[1]).toBeLessThan(resolved.nodes.upper.box[1]);
});
