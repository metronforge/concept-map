import { expect, test } from "vitest";
import { alignLaneRanks } from "../../../src/layout/relations/align-lanes.js";
import { laneRankRelations } from "../../../src/layout/relations/lane-rank.js";
import { checkRelations } from "../../../src/layout/relations/check.js";
import { laneFixture } from "./lane-rank-fixture.js";

for (const right of [false, true]) {
  const axis = right ? 0 : 1;
  test(`apply lane growth with empty lanes and unassigned followers (${right})`, () => {
    const { problem, result } = laneFixture(right);
    const before = structuredClone({ problem, result });
    const aligned = alignLaneRanks(problem, result, 20);
    if (aligned.status !== "determined") throw new Error(aligned.status);
    expect(Object.values(aligned.nodes).map((b) => b[axis])).toEqual([
      50, 50, 90, 210, 270,
    ]);
    expect(
      Object.values(aligned.lanes).map((b) => [b[axis], b[axis + 2]]),
    ).toEqual([
      [0, 120],
      [140, 40],
      [200, 40],
    ]);
    for (const [id, box] of Object.entries(aligned.lanes)) {
      expect(box[1 - axis]).toBe(result.lanes[id][1 - axis]);
      expect(box[3 - axis]).toBe(result.lanes[id][3 - axis]);
    }
    expect({ problem, result }).toEqual(before);
  });

  test(`already aligned fractional nodes and lane extents stay exact (${right})`, () => {
    const { problem, result } = laneFixture(right);
    result.nodes.b[axis] = 10;
    for (const box of [
      ...Object.values(result.nodes),
      ...Object.values(result.lanes),
    ])
      box[axis] += 0.1;
    const aligned = alignLaneRanks(problem, result, 20);
    expect(aligned).toEqual({
      status: "determined",
      nodes: result.nodes,
      lanes: result.lanes,
    });
  });

  test(`cross-lane witnesses name lanes even with a conflicting arrow (${right})`, () => {
    const { problem, result } = laneFixture(right);
    problem.edges.push({ id: "cross", from: "a", to: "observer" });
    problem.constraints.push({
      kind: "sameRank",
      strength: "required",
      nodes: ["a", "observer"],
      path: "layout.hints[1]",
    });
    const aligned = alignLaneRanks(problem, result, 20);
    expect(aligned.status).toBe("contradictory");
    if (aligned.status !== "contradictory") throw new Error(aligned.status);
    expect(
      checkRelations(laneRankRelations(problem, result, 20), aligned),
    ).toBe(true);
    const ids = aligned.cycle.map((r) => r.id);
    for (const path of ["lanes.first", "lanes.last", "layout.hints[1]"])
      expect(ids.some((id) => id.startsWith(path))).toBe(true);
  });
}

test("no same-rank hint retains the original nodes and lanes", () => {
  const { problem, result } = laneFixture();
  problem.constraints = [];
  expect(alignLaneRanks(problem, result, 20)).toEqual({
    status: "determined",
    nodes: result.nodes,
    lanes: result.lanes,
  });
});

test("fractional nodes touching a lane start retain their exact position", () => {
  const { problem, result } = laneFixture();
  result.nodes.a[1] = 0.1;
  result.nodes.b[1] = 0.1;
  result.lanes.first[1] = 0.1;
  expect(alignLaneRanks(problem, result, 20)).toEqual({
    status: "determined",
    nodes: result.nodes,
    lanes: result.lanes,
  });
});

test("a required pin can move its lane before the engine's lane start", () => {
  const { problem, result } = laneFixture();
  problem.constraints = problem.constraints.filter(
    (hint) => hint.kind !== "sameRank",
  );
  problem.constraints.push({
    kind: "pin",
    node: "a",
    position: [10, -10],
    strength: "required",
    path: "layout.hints[1]",
  });
  const aligned = alignLaneRanks(problem, result, 20);
  expect(aligned.status).toBe("determined");
  if (aligned.status !== "determined") return;
  expect(aligned.nodes.a[1]).toBe(-20);
  expect(aligned.lanes.first[1]).toBeLessThanOrEqual(-20);
});
