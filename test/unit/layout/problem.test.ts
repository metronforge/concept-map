import { expect, test } from "vitest";
import { test as property, fc } from "@fast-check/vitest";
import { buildProblem } from "../../../src/layout/build-problem";
import { place } from "../../../src/layout/place";
import {
  isEngineFailure,
  isUnsupportedConstraints,
} from "../../../src/layout/outcomes";
import { measureLabel } from "../../../src/layout/measure";
import type { Placer } from "../../../src/layout/ports";
import { sourceFixture } from "./fixture";

const result = {
  nodes: { a: [0, 0, 100, 100], b: [0, 120, 100, 100] },
  edges: {
    ab: {
      points: [
        [50, 100],
        [50, 120],
      ],
    },
  },
  lanes: { client: [0, 0, 200, 300] },
} satisfies import("../../../src/layout/types").LayoutResult;
const fake = (capabilities: Placer["capabilities"] = {}): Placer => ({
  name: "test placer",
  capabilities,
  place: async () => result,
});
const problem = () => buildProblem(sourceFixture(), measureLabel);

test("required lanes unsupported by a placer name both the constraint and placer", async () => {
  for (const capabilities of [{}, { lanes: "preferred" }] as const) {
    let called = false;
    const outcome = await place(problem(), {
      ...fake(capabilities),
      place: async () => {
        called = true;
        return result;
      },
    });
    expect(called).toBe(false);
    expect(isUnsupportedConstraints(outcome)).toBe(true);
    expect(outcome).toMatchObject({
      message: expect.stringMatching(/lanes.*test placer/),
    });
    expect(isEngineFailure(outcome)).toBe(false);
  }
});

test("unsupported preferred constraints are listed while placement continues", async () => {
  const outcome = await place(problem(), fake({ lanes: "required" }));
  expect(outcome).toEqual({
    kind: "placed",
    result,
    unsupported: [
      { kind: "direction", strength: "preferred", direction: "down" },
      { kind: "order", strength: "preferred", nodes: ["a", "b"] },
      { kind: "mainPath", strength: "preferred", edges: ["ab"] },
    ],
  });
});

test("exceptions and unverified constraint claims are engine failures", async () => {
  const contradiction = {
    kind: "result-rejected",
    message: "lanes contradict",
    constraints: ["lanes"],
  };
  const placer = fake({ lanes: "required", direction: "preferred" });
  for (const cause of [new Error("crash"), contradiction]) {
    const outcome = await place(problem(), {
      ...placer,
      place: async () => {
        throw cause;
      },
    });
    expect(isEngineFailure(outcome)).toBe(true);
    expect(outcome).toMatchObject({ cause });
  }
  const outcome = await place(problem(), {
    ...placer,
    place: async () => contradiction as unknown as typeof result,
  });
  expect(isEngineFailure(outcome)).toBe(true);
});

property.prop([fc.string(), fc.constantFrom("down", "right"), fc.boolean()])(
  "building a problem is deterministic, does not mutate its source and contains no positions",
  (label, direction, lanes) => {
    const source = sourceFixture();
    source.nodes.a.label = label;
    source.direction = direction;
    if (!lanes) {
      source.lanes = {};
      for (const node of Object.values(source.nodes)) delete node.lane;
    }
    const before = structuredClone(source);
    const a = buildProblem(source, measureLabel);
    expect(a).toEqual(buildProblem(source, measureLabel));
    expect(source).toEqual(before);
    expect(a.constraints).toEqual([
      { kind: "direction", strength: "preferred", direction },
      ...(lanes
        ? [
            {
              kind: "lanes",
              strength: "required",
              direction,
              lanes: Object.keys(source.lanes),
            },
          ]
        : []),
      { kind: "order", strength: "preferred", nodes: ["a", "b"] },
      { kind: "mainPath", strength: "preferred", edges: ["ab"] },
    ]);
    expect(a.groups.map((g) => g.id)).toEqual(Object.keys(source.lanes));
    expect(JSON.stringify(a)).not.toMatch(
      /"(?:x|y|box|path|points|viewBox|at)":/,
    );
    expect(a.nodes[0].width).toBeGreaterThan(0);
  },
);

test("untrusted placers cannot mutate the problem being resolved and checked", async () => {
  const input = problem();
  const before = structuredClone(input);
  const outcome = await place(input, {
    ...fake({ direction: "preferred", lanes: "required" }),
    place: async (copy) => {
      copy.nodes[0].width = 1;
      copy.nodes[0].lane = "another lane";
      return result;
    },
  });
  expect(outcome.kind).toBe("placed");
  expect(input).toEqual(before);
});
