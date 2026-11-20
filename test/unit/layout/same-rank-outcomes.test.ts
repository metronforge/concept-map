import { expect, test } from "vitest";
import { alignSameRank } from "../../../src/layout/same-rank.js";
import { problemGraph } from "../../../src/layout/build-problem.js";
import type { Constraint, LayoutProblem } from "../../../src/layout/problem.js";
import type { LayoutResult } from "../../../src/layout/types.js";
import { rankRelations } from "../../../src/layout/relations/rank.js";
import { checkRelations } from "../../../src/layout/relations/check.js";

function hint(
  nodes: string[],
  strength: "required" | "preferred",
  index: number,
): Constraint {
  return {
    kind: "sameRank",
    nodes,
    strength,
    origin: "stated",
    path: `layout.hints[${index}]`,
  };
}
function fixture(hints: Constraint[]) {
  const problem: LayoutProblem = {
    nodes: ["a", "b", "c"].map((id) => ({ id, width: 40, height: 20 })),
    edges: [{ id: "ab", from: "a", to: "b" }],
    groups: [],
    constraints: [
      { kind: "direction", direction: "down", strength: "preferred" },
      ...hints,
    ],
  };
  const placed: LayoutResult = {
    nodes: { a: [0, 0, 40, 20], b: [0, 84, 40, 20], c: [100, 168, 40, 20] },
    edges: {
      ab: {
        points: [
          [20, 20],
          [20, 84],
        ],
      },
    },
    lanes: {},
  };
  return { problem, placed, graph: problemGraph(problem) };
}
function run(hints: Constraint[]) {
  const { problem, placed, graph } = fixture(hints);
  return alignSameRank(problem, graph, placed, 64, 32);
}

test("required conflicts retain the checked cycle and name the hint and arrow", () => {
  const { problem, graph, placed } = fixture([hint(["a", "b"], "required", 4)]);
  const outcome = alignSameRank(problem, graph, placed, 64, 32);
  expect(outcome.status).toBe("contradictory");
  if (outcome.status !== "contradictory") throw new Error(outcome.status);
  expect(
    checkRelations(rankRelations(problem, placed.nodes, 64), outcome),
  ).toBe(true);
  expect(outcome.message).toContain("layout.hints[4]");
  expect(outcome.message).toContain("edges.ab");
  expect(outcome.sum).toBe(84);
});

test("dropping a conflicting preferred hint retains the exact engine result and reason", () => {
  const preferred = hint(["a", "b"], "preferred", 2);
  const { problem, graph, placed } = fixture([preferred]);
  const outcome = alignSameRank(problem, graph, placed, 64, 32);
  expect(outcome.status).toBe("determined");
  if (outcome.status !== "determined") throw new Error(outcome.status);
  expect(outcome.result).toBe(placed);
  expect(outcome.dropped).toHaveLength(1);
  expect(outcome.dropped[0].hint).toEqual(preferred);
  expect(outcome.dropped[0].reason).toContain("layout.hints[2]");
  expect(outcome.dropped[0].reason).toContain("edges.ab");
});

test("a later required hint wins over an incompatible earlier preference", () => {
  const outcome = run([
    hint(["a", "c"], "preferred", 0),
    hint(["b", "c"], "required", 1),
  ]);
  if (outcome.status !== "determined") throw new Error(outcome.status);
  expect(outcome.result.nodes.a).toEqual([0, 0, 40, 20]);
  expect(outcome.result.nodes.b).toEqual([0, 168, 40, 20]);
  expect(outcome.dropped.map((d) => d.hint.path)).toEqual(["layout.hints[0]"]);
  expect(outcome.dropped[0].reason).toContain("layout.hints[1]");
});

test("incompatible preferred hints keep the first and discard only the later one", () => {
  const outcome = run([
    hint(["a", "c"], "preferred", 0),
    hint(["b", "c"], "preferred", 1),
  ]);
  if (outcome.status !== "determined") throw new Error(outcome.status);
  expect(outcome.result.nodes.a[1]).toBe(168);
  expect(outcome.result.nodes.b[1]).toBe(252);
  expect(outcome.result.nodes.c[1]).toBe(168);
  expect(outcome.dropped.map((d) => d.hint.path)).toEqual(["layout.hints[1]"]);
});

test("a rejected preference does not prevent a later compatible preference", () => {
  const outcome = run([
    hint(["a", "b"], "preferred", 0),
    hint(["b", "c"], "preferred", 1),
  ]);
  if (outcome.status !== "determined") throw new Error(outcome.status);
  expect(outcome.result.nodes.a).toEqual([0, 0, 40, 20]);
  expect(outcome.result.nodes.b[1]).toBe(168);
  expect(outcome.result.nodes.c[1]).toBe(168);
  expect(outcome.dropped.map((d) => d.hint.path)).toEqual(["layout.hints[0]"]);
});

test("compatible overlapping groups are accepted without mutating inputs", () => {
  const { problem, graph, placed } = fixture([
    hint(["b", "c"], "required", 0),
    hint(["c", "b"], "preferred", 1),
  ]);
  const before = structuredClone({ problem, graph, placed });
  const outcome = alignSameRank(problem, graph, placed, 64, 32);
  if (outcome.status !== "determined") throw new Error(outcome.status);
  expect(outcome.dropped).toEqual([]);
  expect(outcome.result.nodes.b[1]).toBe(168);
  expect(outcome.result.edges.ab.points.at(-1)).toEqual([20, 168]);
  expect({ problem, graph, placed }).toEqual(before);
});

test("no same-rank hints preserve the exact placement and routes", () => {
  const { problem, graph, placed } = fixture([]);
  expect(alignSameRank(problem, graph, placed, 64, 32)).toEqual({
    status: "determined",
    result: placed,
    dropped: [],
  });
  const outcome = alignSameRank(problem, graph, placed, 64, 32);
  if (outcome.status !== "determined") throw new Error(outcome.status);
  expect(outcome.result).toBe(placed);
});

test("unpathed internal hints keep original constraint indices after priority selection", () => {
  const { path: _first, ...preferred } = hint(["a", "c"], "preferred", 0);
  const { path: _second, ...required } = hint(["b", "c"], "required", 1);
  const outcome = run([preferred, required]);
  if (outcome.status !== "determined") throw new Error(outcome.status);
  expect(outcome.dropped[0].hint.path).toBe("constraints[1]");
  expect(outcome.dropped[0].reason).toContain("constraints[2].nodes[1]");
});

test("a free arrow does not turn an otherwise compatible group into a conflict", () => {
  const outcome = run([
    hint(["a", "b"], "required", 0),
    { kind: "free", edge: "ab", strength: "preferred" },
  ]);
  if (outcome.status !== "determined") throw new Error(outcome.status);
  expect(outcome.result.nodes.a[1]).toBe(84);
  expect(outcome.result.nodes.b[1]).toBe(84);
  expect(outcome.dropped).toEqual([]);
});
