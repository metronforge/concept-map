import { expect, test } from "vitest";
import { place } from "../../../src/layout/place";
import type { Placer } from "../../../src/layout/ports";
import type { Constraint, LayoutProblem } from "../../../src/layout/problem";

const result = {
  nodes: { a: [0, 0, 80, 40], b: [0, 100, 80, 40] },
  edges: {
    ab: {
      points: [
        [40, 40],
        [40, 100],
      ],
    },
  },
  lanes: {},
} satisfies import("../../../src/layout/types").LayoutResult;
const graph = {
  nodes: ["a", "b"].map((id) => ({ id, width: 80, height: 40 })),
  edges: [{ id: "ab", from: "a", to: "b" }],
  groups: [],
};
function free(stated: boolean, strength: "preferred" | "required"): Constraint {
  return {
    kind: "free",
    edge: "ab",
    strength,
    ...(stated ? ({ origin: "stated", path: "layout.hints[0]" } as const) : {}),
  };
}

for (const stated of [false, true]) {
  for (const [strength, requested] of [
    ["preferred", "preferred"],
    ["required", "preferred"],
    ["required", "required"],
  ] as const) {
    test(`${stated ? "stated" : "derived"} ${strength} support accepts ${requested} without claiming support for the other origin`, async () => {
      const supported = free(stated, requested);
      const unsupported = free(!stated, "preferred");
      const input: LayoutProblem = {
        ...graph,
        constraints: [supported, unsupported],
      };
      const placer: Placer = {
        name: "rank exclusion",
        capabilities: {
          free: stated ? { stated: strength } : { derived: strength },
        },
        place: async () => result,
      };
      expect(await place(input, placer)).toEqual({
        kind: "placed",
        result,
        unsupported: [unsupported],
      });
    });
  }
}

for (const { capability, stated } of [
  { capability: {}, stated: false },
  { capability: {}, stated: true },
  { capability: { stated: "preferred", derived: "required" }, stated: true },
  { capability: { derived: "preferred", stated: "required" }, stated: false },
  { capability: { stated: "required" }, stated: false },
  { capability: { derived: "required" }, stated: true },
] as const) {
  test(`required ${stated ? "stated" : "derived"} free rejects absent or preferred support: ${JSON.stringify(capability)}`, async () => {
    const constraint = free(stated, "required");
    let called = false;
    const outcome = await place(
      { ...graph, constraints: [constraint] },
      {
        name: "rank exclusion",
        capabilities: { free: capability },
        place: async () => {
          called = true;
          return result;
        },
      },
    );
    expect(called).toBe(false);
    expect(outcome).toMatchObject({
      kind: "unsupported-constraints",
      constraints: [constraint],
      message: expect.stringMatching(
        stated ? /layout\.hints\[0\].*free.*ab/s : /free/,
      ),
    });
  });
}

test("legacy string capabilities still support both constraint origins", async () => {
  const constraints = [free(false, "required"), free(true, "required")];
  expect(
    await place(
      { ...graph, constraints },
      {
        name: "both origins",
        capabilities: { free: "required" },
        place: async () => result,
      },
    ),
  ).toEqual({ kind: "placed", result, unsupported: [] });
});
