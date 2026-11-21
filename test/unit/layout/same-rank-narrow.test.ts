import { expect, test } from "vitest";
import { SourceMapSchema } from "../../../src/schema.js";
import { layout, check, fontTableMeasurer } from "../../../src/layout/index.js";
import { dagreEngine } from "../../../src/layout/dagre.js";
import { atWidth } from "../../../src/layout/width.js";
import type { UnsupportedHint } from "../../../src/layout/types.js";

function source(strength: "preferred" | "required") {
  const ids = ["start", "quick", "prepare", "finish"];
  return SourceMapSchema.parse({
    format: 3,
    id: "narrow-ranks",
    title: "Narrow outcomes",
    direction: "right",
    layers: { work: { label: "Work" } },
    nodes: Object.fromEntries(
      ids.map((id) => [id, { label: id, layer: "work" }]),
    ),
    edges: {
      quick: { from: "start", to: "quick", label: "X" },
      prepare: { from: "start", to: "prepare" },
      finish: { from: "prepare", to: "finish" },
    },
    layout: {
      hints: [{ kind: "sameRank", nodes: ["quick", "finish"], strength }],
    },
    scenarios: [
      {
        id: "all",
        label: "All",
        steps: [
          {
            id: "all",
            title: "All",
            text: "",
            show: ids,
            edges: ["quick", "prepare", "finish"],
          },
        ],
      },
    ],
  });
}

test("preferred groups are dropped when final narrow refinement adds a hard contact", async () => {
  const map = source("preferred");
  const plain = structuredClone(map);
  plain.layout.hints = [];
  const options = { widthEm: 8, intent: false };
  const before = await layout(plain, dagreEngine, options);
  expect(
    check(plain, before, {
      measureLabel: atWidth(fontTableMeasurer, before, 8),
    }).hard,
  ).toBe(0);
  const calls: (readonly UnsupportedHint[])[] = [];
  const after = await layout(map, dagreEngine, {
    ...options,
    onUnsupportedHints: (h) => calls.push(h),
  });
  expect(calls).toEqual([
    [expect.objectContaining({ reason: "unsupported", conflicts: ["quick"] })],
  ]);
  expect(
    check(map, after, { measureLabel: atWidth(fontTableMeasurer, after, 8) })
      .hard,
  ).toBe(0);
});

test("required groups report routing failure after final narrow refinement", async () => {
  await expect(
    layout(source("required"), dagreEngine, { widthEm: 8, intent: false }),
  ).rejects.toMatchObject({
    kind: "same-rank-routing",
    data: { conflicts: ["quick"] },
    message: expect.stringContaining("layout.hints[0]"),
  });
});
