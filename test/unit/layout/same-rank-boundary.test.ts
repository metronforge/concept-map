import { expect, test } from "vitest";
import { alignSameRank } from "../../../src/layout/same-rank.js";
import { acceptSameRank } from "../../../src/layout/same-rank-boundary.js";
import { LayoutError, isLayoutError } from "../../../src/layout/index.js";
import { checkRelations } from "../../../src/layout/relations/check.js";
import { rankRelations } from "../../../src/layout/relations/rank.js";
import { hint, routingFixture } from "./same-rank-routing-fixture.js";

function run(
  nodes: string[],
  strength: "required" | "preferred",
  down = false,
) {
  const f = routingFixture([hint(nodes, strength, 4)], down);
  const outcome = alignSameRank(
    f.problem,
    f.graph,
    f.original,
    64,
    32,
    nodes.includes("c") ? () => ["ab"] : f.inspect,
  );
  return { ...f, outcome };
}

function failure(action: () => unknown): LayoutError {
  try {
    action();
  } catch (error) {
    expect(error).toBeInstanceOf(LayoutError);
    expect(isLayoutError(error)).toBe(true);
    return error as LayoutError;
  }
  throw new Error("Expected alignment to fail");
}

for (const down of [false, true]) {
  test(`${down ? "down" : "right"}: contradiction errors retain the independently checked cycle`, () => {
    const f = run(["a", "b"], "required", down);
    const error = failure(() => acceptSameRank(f.outcome));
    expect(error).toMatchObject({
      name: "SameRankContradictionError",
      kind: "same-rank-contradiction",
    });
    expect(error.data).toBe(f.outcome);
    expect(error.message).toContain("layout.hints[4].nodes[1]");
    expect(error.message).toContain("edges.ab");
    expect(
      checkRelations(rankRelations(f.problem, f.original.nodes, 64), f.outcome),
    ).toBe(true);
    expect(error.data).not.toHaveProperty("result");
  });

  test(`${down ? "down" : "right"}: routing errors name the hint and arrow without claiming a contradiction`, () => {
    const f = run(["a", "c"], "required", down);
    const error = failure(() => acceptSameRank(f.outcome));
    expect(error).toMatchObject({
      name: "SameRankRoutingError",
      kind: "same-rank-routing",
      data: { hints: [hint(["a", "c"], "required", 4)], conflicts: ["ab"] },
    });
    expect(error.data).toBe(f.outcome);
    expect(error.message).toContain("layout.hints[4]");
    expect(error.message).toContain("ab");
    expect(error.data).not.toHaveProperty("cycle");
    expect(error.data).not.toHaveProperty("result");
  });
}

test.each([
  {
    nodes: ["a", "b"],
    reason: "contradiction",
    conflicts: ["layout.hints[4].nodes[1]", "edges.ab"],
  },
  { nodes: ["a", "c"], reason: "unsupported", conflicts: ["ab"] },
])(
  "dropped preferences expose $reason and ordered conflicts with unchanged geometry",
  ({ nodes, reason, conflicts }) => {
    const f = run(nodes, "preferred");
    const saved = structuredClone(f.outcome);
    const accepted = acceptSameRank(f.outcome);
    expect(accepted.result).toBe(f.original);
    expect(accepted.unsupported).toEqual([
      {
        ...hint(nodes, "preferred", 4),
        reason,
        conflicts,
      },
    ]);
    expect(accepted.unsupported[0]).not.toHaveProperty("witness");
    expect(f.outcome).toEqual(saved);
  },
);

test("accepted alignment returns moved geometry without unsupported diagnostics", () => {
  const f = run(["s", "t"], "required");
  const accepted = acceptSameRank(f.outcome);
  expect(accepted.result.nodes.s[0]).toBe(400);
  expect(accepted.result.nodes.t[0]).toBe(400);
  expect(accepted.unsupported).toEqual([]);
});

test("mixed refusals retain source order and do not share writable node arrays", () => {
  const f = routingFixture([
    hint(["a", "b"], "preferred", 0),
    hint(["a", "c"], "preferred", 1),
    hint(["s", "t"], "required", 2),
  ]);
  const outcome = alignSameRank(
    f.problem,
    f.graph,
    f.original,
    64,
    32,
    (candidate) =>
      candidate.nodes.a[0] !== f.original.nodes.a[0] ? ["ab"] : [],
  );
  const saved = structuredClone(outcome);
  const accepted = acceptSameRank(outcome);
  expect(accepted.unsupported.map((h) => [h.path, h.reason])).toEqual([
    ["layout.hints[0]", "contradiction"],
    ["layout.hints[1]", "unsupported"],
  ]);
  expect(accepted.result.nodes.s[0]).toBe(400);
  const first = accepted.unsupported[0];
  if (first.kind !== "sameRank") throw new Error(first.kind);
  first.nodes.push("consumer-edit");
  expect(outcome).toEqual(saved);
});

test("internal constraints without source origins do not become callback hints", () => {
  const f = run(["a", "b"], "preferred");
  if (f.outcome.status !== "determined") throw new Error(f.outcome.status);
  const dropped = f.outcome.dropped[0];
  const internal = {
    ...f.outcome,
    dropped: [
      { ...dropped, hint: { ...dropped.hint, origin: "derived" as const } },
      { ...dropped, hint: { ...dropped.hint, path: undefined } },
    ],
  };
  expect(acceptSameRank(internal).unsupported).toEqual([]);
});

test.each([
  ["SameRankContradictionError", "same-rank-contradiction"],
  ["SameRankRoutingError", "same-rank-routing"],
])(
  "the public base guard recognizes %s across package copies",
  (name, kind) => {
    expect(isLayoutError({ name, kind })).toBe(true);
    expect(isLayoutError({ name, kind: "wrong" })).toBe(false);
    expect(isLayoutError({ name: "wrong", kind })).toBe(false);
  },
);

test("same-rank errors and guards are available from the layout entry point", async () => {
  const api = await import("../../../src/layout/index.js");
  for (const [name, kind, guard] of [
    [
      "SameRankContradictionError",
      "same-rank-contradiction",
      "isSameRankContradictionError",
    ],
    ["SameRankRoutingError", "same-rank-routing", "isSameRankRoutingError"],
  ] as const) {
    expect(api[name]).toBeTypeOf("function");
    expect(api[guard]({ name, kind })).toBe(true);
    expect(api[guard]({ name, kind: "wrong" })).toBe(false);
    expect(api[guard]({ name: "wrong", kind })).toBe(false);
  }
});
