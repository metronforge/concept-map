import { expect, test } from "vitest";
import fc from "fast-check";
import type { LayoutProblem } from "../../../src/layout/problem.js";
import type { LayoutBox, LayoutResult } from "../../../src/layout/types.js";
import { laneRankRelations } from "../../../src/layout/relations/lane-rank.js";
import { solveRelations } from "../../../src/layout/relations/solve.js";
import { checkRelations } from "../../../src/layout/relations/check.js";

const cases = fc.record({
  counts: fc.array(fc.integer({ min: 0, max: 4 }), {
    minLength: 1,
    maxLength: 5,
  }),
  members: fc.uniqueArray(fc.nat(30), { minLength: 2, maxLength: 6 }),
  right: fc.boolean(),
  offset: fc.integer({ min: -10000, max: 10000 }),
  size: fc.integer({ min: 640, max: 2000 }),
});

function placements(input: fc.ArbitraryValue<typeof cases>) {
  const offset = input.offset / 64,
    size = input.size / 64;
  const box = (rank: number, extent: number): LayoutBox =>
    input.right
      ? [rank + offset, 0, extent, 20]
      : [0, rank + offset, 20, extent];
  const result: LayoutResult = { nodes: {}, edges: {}, lanes: {} };
  const problem: LayoutProblem = {
    nodes: [],
    edges: [],
    groups: [],
    constraints: [],
  };
  const nodes = [...problem.nodes],
    groups = [...problem.groups];
  for (const [i, count] of [...input.counts, 2].entries()) {
    const lane = i < input.counts.length ? `lane${i}` : undefined;
    if (lane) {
      result.lanes[lane] = box(i * 512, 400);
      groups.push({ id: lane, label: { width: 20, height: 10 } });
    }
    for (let j = 0; j < count; j++) {
      const id = `n${nodes.length}`;
      result.nodes[id] = box(i * 512 + 20 + j * 60, size);
      nodes.push({
        id,
        lane,
        width: result.nodes[id][2],
        height: result.nodes[id][3],
      });
    }
  }
  return { problem: { ...problem, nodes, groups }, result };
}

function generated(input: fc.ArbitraryValue<typeof cases>) {
  const { problem, result } = placements(input);
  const nodes = problem.nodes;
  const members = [
    ...new Set(input.members.map((i) => nodes[i % nodes.length].id)),
  ];
  if (members.length < 2)
    members.push(nodes.find((n) => n.id !== members[0])!.id);
  problem.constraints = [
    {
      kind: "direction",
      direction: input.right ? "right" : "down",
      strength: "preferred",
    },
    {
      kind: "sameRank",
      strength: "required",
      nodes: members,
      path: "layout.hints[0]",
    },
  ];
  return { problem, result, members };
}

function verifyPositions(
  { problem, result, members }: ReturnType<typeof generated>,
  solution: Extract<
    ReturnType<typeof solveRelations>,
    { status: "determined" }
  >,
  right: boolean,
) {
  const p = Object.fromEntries(
    solution.placements.map((v) => [v.variable, v.position]),
  );
  const axis = right ? 0 : 1;
  expect(new Set(members.map((id) => p[id])).size).toBe(1);
  // These roomy lanes can absorb every hint: unrelated boxes need not move.
  for (const n of problem.nodes) {
    expect(p[n.id]).toBeGreaterThanOrEqual(result.nodes[n.id][axis]);
    if (!members.includes(n.id)) expect(p[n.id]).toBe(result.nodes[n.id][axis]);
    if (n.lane) {
      expect(p[n.id]).toBeGreaterThanOrEqual(p[`$lane.${n.lane}.start`]);
      expect(p[n.id] + result.nodes[n.id][axis + 2]).toBeLessThanOrEqual(
        p[`$lane.${n.lane}.end`],
      );
    }
  }
  for (const [i, lane] of problem.groups.entries()) {
    expect(p[`$lane.${lane.id}.start`]).toBe(result.lanes[lane.id][axis]);
    expect(p[`$lane.${lane.id}.end`]).toBe(
      result.lanes[lane.id][axis] + result.lanes[lane.id][axis + 2],
    );
    if (i)
      expect(p[`$lane.${problem.groups[i - 1].id}.end`]).toBeLessThanOrEqual(
        p[`$lane.${lane.id}.start`],
      );
  }
}

function verify(input: fc.ArbitraryValue<typeof cases>) {
  const { problem, result, members } = generated(input);
  const before = structuredClone({ problem, result });
  const system = laneRankRelations(problem, result, 64);
  const solution = solveRelations(system);
  expect(checkRelations(system, solution)).toBe(true);
  const lanes = new Set(
    problem.nodes.filter((n) => members.includes(n.id)).map((n) => n.lane),
  );
  expect(solution.status).toBe(lanes.size > 1 ? "contradictory" : "determined");
  if (solution.status === "contradictory") {
    expect(solution.cycle.some((s) => s.id.startsWith("lanes."))).toBe(true);
    expect(solution.cycle.some((s) => s.id.startsWith("layout.hints[0]"))).toBe(
      true,
    );
  } else if (solution.status === "determined") {
    verifyPositions({ problem, result, members }, solution, input.right);
  }
  expect({ problem, result }).toEqual(before);
}

test("1,000 lane maps align within lanes or name checked lane conflicts", () => {
  fc.assert(fc.property(cases, verify), { numRuns: 1000, seed: 78 });
});
