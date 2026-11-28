import { expect, test } from "vitest";
import {
  buildProblem,
  problemGraph,
} from "../../../src/layout/build-problem.js";
import { dagreEngine } from "../../../src/layout/dagre.js";
import { elkEngine } from "../../../src/layout/elk.js";
import { measureLabel } from "../../../src/layout/measure.js";
import { laneRankRelations } from "../../../src/layout/relations/lane-rank.js";
import { rankRelations } from "../../../src/layout/relations/rank.js";
import { solveRelations } from "../../../src/layout/relations/solve.js";
import { checkRelations } from "../../../src/layout/relations/check.js";
import { laneFixture, laneSource } from "./lane-rank-fixture.js";

for (const right of [false, true]) {
  test(`lane growth moves empty lanes, observers and unassigned nodes (${right})`, () => {
    const { problem, result } = laneFixture(right);
    const before = structuredClone({ problem, result });
    const system = laneRankRelations(problem, result, 20);
    const solution = solveRelations(system);
    expect(checkRelations(system, solution)).toBe(true);
    if (solution.status !== "determined") throw new Error(solution.status);
    const positions = Object.fromEntries(
      solution.placements.map((p) => [p.variable, p.position]),
    );
    expect(positions).toMatchObject({
      a: 50,
      b: 50,
      tail: 90,
      observer: 210,
      loose: 270,
      "$lane.first.start": 0,
      "$lane.first.end": 120,
      "$lane.empty.start": 140,
      "$lane.empty.end": 180,
      "$lane.last.start": 200,
      "$lane.last.end": 240,
    });
    expect({ problem, result }).toEqual(before);
  });
}

test("no lanes leaves the rank system unchanged", () => {
  const { problem, result } = laneFixture();
  const plain = { ...problem, groups: [] };
  expect(laneRankRelations(plain, { ...result, lanes: {} }, 20)).toEqual(
    rankRelations(plain, result.nodes, 20),
  );
});

test("required pins may close an engine lane gap while keeping lane order", () => {
  const { problem, result } = laneFixture();
  problem.groups = problem.groups.filter(({ id }) => id !== "empty");
  delete result.lanes.empty;
  problem.constraints = problem.constraints.filter(
    (c) => c.kind !== "sameRank",
  );
  problem.constraints.push({
    kind: "pin",
    node: "observer",
    position: [10, 120],
    strength: "required",
    path: "layout.hints[1]",
  });
  const system = laneRankRelations(problem, result, 20);
  const solution = solveRelations(system);
  expect(checkRelations(system, solution)).toBe(true);
  expect(solution.status).toBe("determined");
  if (solution.status !== "determined") return;
  const positions = Object.fromEntries(
    solution.placements.map((p) => [p.variable, p.position]),
  );
  expect(positions.observer).toBe(110);
  expect(positions["$lane.last.start"]).toBeGreaterThanOrEqual(
    positions["$lane.first.end"],
  );
});

test("without a hint, every lane boundary and node retains its engine rank", () => {
  const { problem, result } = laneFixture();
  const system = laneRankRelations({ ...problem, constraints: [] }, result, 20);
  const solution = solveRelations(system);
  expect(checkRelations(system, solution)).toBe(true);
  if (solution.status !== "determined") throw new Error(solution.status);
  const positions = Object.fromEntries(
    solution.placements.map((p) => [p.variable, p.position]),
  );
  for (const [id, box] of Object.entries(result.nodes))
    expect(positions[id]).toBe(box[1]);
  for (const [id, box] of Object.entries(result.lanes)) {
    expect(positions[`$lane.${id}.start`]).toBe(box[1]);
    expect(positions[`$lane.${id}.end`]).toBe(box[1] + box[3]);
  }
});

for (const [name, engine] of [
  ["dagre", dagreEngine],
  ["elk", elkEngine],
] as const) {
  for (const direction of ["down", "right"] as const) {
    test(`${name}, ${direction}: cross-lane groups have checked lane-path conflicts`, async () => {
      const problem = buildProblem(
        laneSource(direction, true),
        measureLabel,
        false,
      );
      const original = await engine.layout(problemGraph(problem));
      const system = laneRankRelations(problem, original, 64);
      const solution = solveRelations(system);
      expect(checkRelations(system, solution)).toBe(true);
      expect(solution.status).toBe("contradictory");
      if (solution.status !== "contradictory") throw new Error(solution.status);
      const ids = solution.cycle.map((s) => s.id);
      for (const path of ["lanes.first", "lanes.second", "layout.hints[0]"])
        expect(ids.some((id) => id.startsWith(path))).toBe(true);
    });

    test(`${name}, ${direction}: followers grow a lane and move its later observer`, async () => {
      const problem = buildProblem(
        laneSource(direction, false),
        measureLabel,
        false,
      );
      const original = await engine.layout(problemGraph(problem));
      const system = laneRankRelations(problem, original, 64);
      const solution = solveRelations(system);
      expect(checkRelations(system, solution)).toBe(true);
      if (solution.status !== "determined") throw new Error(solution.status);
      const p = Object.fromEntries(
        solution.placements.map((v) => [v.variable, v.position]),
      );
      const axis = direction === "down" ? 1 : 0;
      expect(p.quick).toBe(p.finish);
      expect(p.tail).toBe(p.quick + original.nodes.quick[axis + 2] + 64);
      expect(p.observer).toBeGreaterThan(original.nodes.observer[axis]);
      expect(p.start).toBe(original.nodes.start[axis]);
      expect(p.prepare).toBe(original.nodes.prepare[axis]);
      expect(p["$lane.first.end"]).toBeLessThanOrEqual(p["$lane.second.start"]);
      for (const n of problem.nodes) {
        expect(p[n.id]).toBeGreaterThanOrEqual(p[`$lane.${n.lane}.start`]);
        expect(p[n.id] + original.nodes[n.id][axis + 2]).toBeLessThanOrEqual(
          p[`$lane.${n.lane}.end`],
        );
      }
    });
  }
}
