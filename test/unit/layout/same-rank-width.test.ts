import { expect, test } from "vitest";
import { layout, measureLabel } from "../../../src/layout/index.js";
import type {
  LayoutResult,
  UnsupportedHint,
} from "../../../src/layout/types.js";
import { hint, routingFixture } from "./same-rank-routing-fixture.js";

function placement(original: LayoutResult, conflict: boolean) {
  const result = structuredClone(original);
  if (!conflict) {
    result.nodes.b[0] = 0;
    result.edges.ab.points = [
      [30, 36],
      [30, 120],
    ];
  }
  return result;
}

for (const finalConflict of [false, true]) {
  test(`width retries report only final refusals: conflict=${finalConflict}`, async () => {
    const f = routingFixture([]);
    f.source.layout = {
      hints: [{ kind: "sameRank", nodes: ["a", "b"], strength: "preferred" }],
    };
    let passes = 0;
    const calls: (readonly UnsupportedHint[])[] = [];
    const resolved = await layout(
      f.source,
      {
        layout: async () => {
          const conflict = ++passes === 1 ? !finalConflict : finalConflict;
          return placement(f.original, conflict);
        },
      },
      {
        widthEm: 1,
        intent: false,
        measureLabel: (text, style) =>
          measureLabel(text, { ...style, fontSize: 10.5 }),
        onUnsupportedHints: (h) => calls.push(h),
      },
    );
    expect(passes).toBe(2);
    expect(calls).toHaveLength(finalConflict ? 1 : 0);
    if (finalConflict)
      expect(calls[0]).toEqual([
        expect.objectContaining({ reason: "contradiction" }),
      ]);
    expect(resolved.nodes.a.box[0] === resolved.nodes.b.box[0]).toBe(
      !finalConflict,
    );
  });
}

test.each(["required", "preferred"] as const)(
  "public routing for %s hints clears the moved arrow",
  async (strength) => {
    const f = routingFixture([hint(["a", "c"], strength)]);
    f.source.layout = {
      hints: [{ kind: "sameRank", nodes: ["a", "c"], strength }],
    };
    const calls: (readonly UnsupportedHint[])[] = [];
    const result = layout(
      f.source,
      { layout: async () => structuredClone(f.original) },
      {
        intent: false,
        onUnsupportedHints: (h) => calls.push(h),
      },
    );
    const resolved = await result;
    expect(resolved.nodes.a.box).toEqual([56, 16, 60, 36]);
    expect(calls).toEqual([]);
  },
);
