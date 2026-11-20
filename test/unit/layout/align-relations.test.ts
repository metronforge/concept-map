import { expect, test } from "vitest";
import type { LayoutProblem, Direction } from "../../../src/layout/problem.js";
import type { LayoutResult } from "../../../src/layout/types.js";
import { alignBoxes } from "../../../src/layout/relations/align.js";
import { applyRelations } from "../../../src/layout/relations/apply.js";
import { rankRelations } from "../../../src/layout/relations/rank.js";
import { solveRelations } from "../../../src/layout/relations/solve.js";
import { checkRelations } from "../../../src/layout/relations/check.js";

const originalBoxes: LayoutResult["nodes"] = {
  start: [10.1, 0.1, 60, 36],
  quick: [10.1, 100.1, 60, 36],
  prepare: [150.1, 100.1, 60, 36],
  finish: [10.1, 200.1, 60, 36],
  after: [250.1, 200.1, 60, 36],
  unrelated: [400.1, 500.1, 60, 36],
  distant: [10.1, 600.1, 60, 36],
};

function fixture(direction: Direction) {
  const boxes = structuredClone(originalBoxes);
  if (direction === "right")
    for (const [id, [x, y, w, h]] of Object.entries(boxes))
      boxes[id] = [y, x, h, w];
  const problem: LayoutProblem = {
    nodes: Object.entries(boxes).map(([id, b]) => ({
      id,
      width: b[2],
      height: b[3],
    })),
    edges: [
      { id: "quick", from: "start", to: "quick" },
      { id: "prepare", from: "start", to: "prepare" },
      { id: "finish", from: "prepare", to: "finish" },
      { id: "after", from: "quick", to: "after" },
      { id: "distant", from: "quick", to: "distant" },
    ],
    groups: [],
    constraints: [
      { kind: "direction", direction, strength: "preferred" },
      {
        kind: "sameRank",
        nodes: ["quick", "finish"],
        strength: "required",
        path: "layout.hints[0]",
      },
    ],
  };
  return { boxes, problem, axis: direction === "right" ? 0 : 1 } as const;
}

for (const direction of ["down", "right"] as const) {
  test(`${direction}: apply alignment and separation without rounding unforced boxes`, () => {
    const { problem, boxes, axis } = fixture(direction);
    const before = structuredClone({ problem, boxes });
    const result = alignBoxes(problem, boxes, 64, 32);
    expect(result.status).toBe("determined");
    if (result.status !== "determined") throw new Error(result.status);
    expect(result.nodes.quick[axis]).toBe(200.109375);
    expect(result.nodes.finish[axis]).toBe(200.109375);
    expect(result.nodes.after[axis]).toBe(300.109375);
    expect(result.nodes.finish[1 - axis]).toBe(10.1);
    expect(result.nodes.quick[1 - axis]).toBe(102.109375);
    for (const id of ["start", "prepare", "unrelated", "distant"])
      expect(result.nodes[id]).toEqual(boxes[id]);
    for (const id of Object.keys(boxes))
      expect(result.nodes[id].slice(2)).toEqual(boxes[id].slice(2));
    expect({ problem, boxes }).toEqual(before);
  });

  test(`${direction}: nearby fractional hint coordinates become exactly equal`, () => {
    const { problem, boxes, axis } = fixture(direction);
    problem.edges = [];
    boxes.quick[axis] = 200.101;
    boxes.finish[axis] = 200.102;
    const result = alignBoxes(problem, boxes, 64, 32);
    if (result.status !== "determined") throw new Error(result.status);
    expect(result.nodes.quick[axis]).toBe(result.nodes.finish[axis]);
    expect(result.nodes.quick[axis]).toBeGreaterThanOrEqual(200.102);
  });
}

test("a checked contradiction retains the hint and forward arrows, without moving boxes", () => {
  const { problem, boxes } = fixture("down");
  problem.constraints.push({
    kind: "sameRank",
    nodes: ["start", "finish"],
    strength: "required",
    path: "layout.hints[1]",
  });
  const before = structuredClone(boxes);
  const result = alignBoxes(problem, boxes, 64, 32);
  expect(result.status).toBe("contradictory");
  if (result.status !== "contradictory") throw new Error(result.status);
  expect(checkRelations(rankRelations(problem, boxes, 64), result)).toBe(true);
  expect(result.cycle.map((r) => r.id).sort()).toEqual([
    "edges.finish",
    "edges.prepare",
    "layout.hints[1].nodes[1]",
  ]);
  expect(boxes).toEqual(before);
});

test("without same-rank hints all engine boxes are retained exactly", () => {
  const { problem, boxes } = fixture("down");
  problem.constraints = problem.constraints.filter(
    (c) => c.kind !== "sameRank",
  );
  expect(alignBoxes(problem, boxes, 64, 32)).toEqual({
    status: "determined",
    nodes: boxes,
  });
});

test("a corrupted solver witness cannot be applied", () => {
  const { problem, boxes } = fixture("down");
  const system = rankRelations(problem, boxes, 64);
  const result = solveRelations(system);
  if (result.status !== "determined") throw new Error(result.status);
  result.placements.find((p) => p.variable === "quick")!.position = 0;
  expect(() => applyRelations(system, result, boxes, 1)).toThrow(
    /internal.*witness/i,
  );
});

test("an unexpected free shift is an internal error carrying its witness", () => {
  const { problem, boxes } = fixture("down");
  const system = rankRelations(problem, boxes, 64);
  system.relations = system.relations.filter((r) => r.to !== "unrelated");
  const result = solveRelations(system);
  expect(result.status).toBe("underdetermined");
  expect(() => applyRelations(system, result, boxes, 1)).toThrow(
    /internal.*unrelated.*-0\.015625/i,
  );
});

for (const direction of ["down", "right"] as const) {
  test(`${direction}: aligned fractional groups leave touching neighbors in place`, () => {
    const { problem, axis } = fixture(direction);
    const boxes: LayoutResult["nodes"] = {
      a: [0, 0.1, 60, 36],
      b: [100, 0.1, 60, 36],
      c: [0.2, 36.1, 60, 36],
      d: [200, 0.1, 60, 36],
    };
    if (axis === 0)
      for (const [id, [x, y, w, h]] of Object.entries(boxes))
        boxes[id] = [y, x, h, w];
    problem.nodes = Object.entries(boxes).map(([id, b]) => ({
      id,
      width: b[2],
      height: b[3],
    }));
    problem.edges = [];
    problem.constraints = [
      { kind: "direction", direction, strength: "preferred" },
      { kind: "sameRank", nodes: ["a", "b"], strength: "required" },
      { kind: "sameRank", nodes: ["b", "d"], strength: "required" },
    ];
    expect(alignBoxes(problem, boxes, 64, 32)).toEqual({
      status: "determined",
      nodes: boxes,
    });
  });
}

test("an already-aligned group still moves when a predecessor forces it", () => {
  const { problem, boxes } = fixture("down");
  boxes.distant = [400.1, 200.1, 60, 36];
  problem.constraints.push({
    kind: "sameRank",
    nodes: ["after", "distant"],
    strength: "required",
  });
  const result = alignBoxes(problem, boxes, 64, 32);
  if (result.status !== "determined") throw new Error(result.status);
  expect(result.nodes.after[1]).toBe(300.109375);
  expect(result.nodes.distant[1]).toBe(result.nodes.after[1]);
});
