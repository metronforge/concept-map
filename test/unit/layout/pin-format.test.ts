import { expect, test } from "vitest";
import { SourceMapSchema } from "../../../src/schema";
import { validateReferences } from "../../../src/schema/references";
import { layout } from "../../../src/layout/index";
import { dagreEngine } from "../../../src/layout/dagre";

const source = {
  format: 3,
  id: "sketch",
  title: "Sketch",
  layers: { service: { label: "Service" } },
  nodes: { guest: { label: "Guest", layer: "service" } },
  scenarios: [
    {
      id: "all",
      label: "All",
      steps: [{ id: "show", title: "Show", text: "" }],
    },
  ],
};

test("pin hints keep centre coordinates and reject duplicate or unknown nodes", () => {
  for (const strength of ["preferred", "required"] as const) {
    const map = SourceMapSchema.parse({
      ...source,
      layout: {
        hints: [{ kind: "pin", node: "guest", at: [80, 120], strength }],
      },
    });
    expect(map.layout?.hints[0]).toEqual({
      kind: "pin",
      node: "guest",
      at: [80, 120],
      strength,
    });
    expect(() => validateReferences(map)).not.toThrow();
  }
  const unknown = SourceMapSchema.parse({
    ...source,
    layout: { hints: [{ kind: "pin", node: "missing", at: [80, 120] }] },
  });
  expect(() => validateReferences(unknown)).toThrow(
    /layout\.hints\[0\]\.node.*missing/,
  );
  const duplicate = SourceMapSchema.parse({
    ...source,
    layout: {
      hints: [
        { kind: "pin", node: "guest", at: [80, 120] },
        { kind: "pin", node: "guest", at: [90, 120] },
      ],
    },
  });
  expect(() => validateReferences(duplicate)).toThrow(
    /layout\.hints\[1\].*duplicate.*guest/,
  );
});

test("unsupported pin reports its source coordinates", async () => {
  const map = SourceMapSchema.parse({
    ...source,
    layout: { hints: [{ kind: "pin", node: "guest", at: [80, 120] }] },
  });
  const unsupported: unknown[] = [];
  await layout(map, dagreEngine, {
    onUnsupportedHints: (hints) => unsupported.push(...hints),
  });
  expect(unsupported).toEqual([
    {
      kind: "pin",
      node: "guest",
      at: [80, 120],
      strength: "preferred",
      origin: "stated",
      path: "layout.hints[0]",
      reason: "unsupported",
    },
  ]);
});
