import { expect, test } from "vitest";
import { test as property, fc } from "@fast-check/vitest";
import { alignSameRank } from "../../../src/layout/same-rank.js";
import { check } from "../../../src/layout/stages/report.js";
import { rerouteMovedEdges } from "../../../src/layout/moved-routes.js";
import { hint, routingFixture } from "./same-rank-routing-fixture.js";

for (const down of [false, true]) {
  test(`${down ? "down" : "right"}: unsafe preferred alignment restores the exact original`, () => {
    const preferred = hint(["a", "c"]);
    const f = routingFixture([preferred], down);
    expect(check(f.source, f.before).hard).toBe(0);
    const saved = structuredClone(f.original);
    const outcome = alignSameRank(
      f.problem,
      f.graph,
      f.original,
      64,
      32,
      () => ["ab"],
    );
    expect(outcome.status).toBe("determined");
    if (outcome.status !== "determined") throw new Error(outcome.status);
    expect(outcome.result).toBe(f.original);
    expect(outcome.dropped).toEqual([
      { hint: preferred, reason: "unsupported", conflicts: ["ab"] },
    ]);
    expect(f.original).toEqual(saved);
  });

  test(`${down ? "down" : "right"}: required routing failure names hint and arrow, with no drawing`, () => {
    const required = hint(["a", "c"], "required", 4);
    const f = routingFixture([required], down);
    const outcome = alignSameRank(
      f.problem,
      f.graph,
      f.original,
      64,
      32,
      () => ["ab"],
    );
    expect(outcome).toMatchObject({
      status: "routing-failed",
      hints: [required],
      conflicts: ["ab"],
    });
    expect(outcome).not.toHaveProperty("result");
    expect(outcome).toHaveProperty(
      "message",
      expect.stringMatching(/layout\.hints\[4\].*ab/s),
    );
  });
}

test.each(["preferred", "required"] as const)(
  "a refused preference retains earlier safe %s alignment and tries later hints",
  (strength) => {
    const f = routingFixture([
      hint(["s", "t"], strength, 0),
      hint(["a", "c"], "preferred", 1),
      hint(["b", "c"], "preferred", 2),
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
    if (outcome.status !== "determined") throw new Error(outcome.status);
    expect(outcome.result.nodes.a).toEqual(f.original.nodes.a);
    expect(outcome.result.nodes.s[0]).toBe(400);
    expect(outcome.result.nodes.c[0]).toBe(300);
    expect(outcome.dropped.map((d) => d.hint.path)).toEqual([
      "layout.hints[1]",
    ]);
    expect(f.inspect(outcome.result)).toEqual([]);
  },
);

test("a required routing failure cannot be rescued by an earlier preference", () => {
  const f = routingFixture([
    hint(["b", "c"], "preferred", 0),
    hint(["a", "c"], "required", 1),
  ]);
  const outcome = alignSameRank(f.problem, f.graph, f.original, 64, 32, () => [
    "ab",
  ]);
  expect(outcome).toMatchObject({
    status: "routing-failed",
    hints: [f.problem.constraints[2]],
    conflicts: ["ab"],
  });
});

test("a rejected channel falls back to a safe stretched route", () => {
  const f = routingFixture([hint(["a", "c"], "required")]);
  const outcome = alignSameRank(
    f.problem,
    f.graph,
    f.original,
    64,
    32,
    (candidate) => (candidate.edges.ab.points[1][0] === 200 ? ["ab"] : []),
  );
  if (outcome.status !== "determined") throw new Error(outcome.status);
  expect(outcome.result).toEqual(
    rerouteMovedEdges(f.graph, f.original, outcome.result.nodes),
  );
});

test("no hints retain the original without inspecting a candidate", () => {
  const f = routingFixture([]);
  const outcome = alignSameRank(f.problem, f.graph, f.original, 64, 32, () => {
    throw new Error("No candidate");
  });
  expect(outcome).toEqual({
    status: "determined",
    result: f.original,
    dropped: [],
  });
});

property.prop([fc.integer({ min: 30 * 64, max: 60 * 64 }), fc.boolean()], {
  numRuns: 1000,
})(
  "preferred source-penetrating stretches use safe channels for fractional positions",
  (ticks, down) => {
    const f = routingFixture([hint(["a", "c"])], down, ticks / 64);
    const outcome = alignSameRank(
      f.problem,
      f.graph,
      f.original,
      64,
      32,
      f.inspect,
    );
    expect(outcome.status).toBe("determined");
    if (outcome.status !== "determined") throw new Error(outcome.status);
    expect(outcome.dropped).toEqual([]);
    expect(outcome.result.nodes.a).not.toEqual(f.original.nodes.a);
    expect(f.inspect(outcome.result)).toEqual([]);
  },
  30000,
);

test("required groups are checked together when one movement repairs another route", () => {
  const f = routingFixture([
    hint(["a", "c"], "required", 0),
    hint(["b", "t"], "required", 1),
  ]);
  const outcome = alignSameRank(
    f.problem,
    f.graph,
    f.original,
    64,
    32,
    f.inspect,
  );
  if (outcome.status !== "determined") throw new Error(outcome.status);
  expect(outcome.result.nodes.a[0]).toBe(40);
  expect(outcome.result.nodes.b[0]).toBe(400);
  expect(outcome.dropped).toEqual([]);
  expect(f.inspect(outcome.result)).toEqual([]);
});

test("relation contradictions do not invoke route inspection", () => {
  const f = routingFixture([hint(["a", "b"], "required")]);
  const outcome = alignSameRank(f.problem, f.graph, f.original, 64, 32, () => {
    throw new Error("No drawable candidate");
  });
  expect(outcome.status).toBe("contradictory");
});

test("inspection failures propagate instead of silently accepting or dropping hints", () => {
  const f = routingFixture([hint(["s", "t"])]);
  const failure = new Error("Independent check failed");
  expect(() =>
    alignSameRank(f.problem, f.graph, f.original, 64, 32, () => {
      throw failure;
    }),
  ).toThrow(failure);
});
