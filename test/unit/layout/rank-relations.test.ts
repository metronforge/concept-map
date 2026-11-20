import { expect, test } from "vitest";
import { SourceMapSchema } from "../../../src/schema.js";
import {
  buildProblem,
  problemGraph,
} from "../../../src/layout/build-problem.js";
import { dagreEngine } from "../../../src/layout/dagre.js";
import { elkEngine } from "../../../src/layout/elk.js";
import { measureLabel } from "../../../src/layout/measure.js";
import { rankRelations } from "../../../src/layout/relations/rank.js";
import { alignBoxes } from "../../../src/layout/relations/align.js";
import { solveRelations } from "../../../src/layout/relations/solve.js";
import { checkRelations } from "../../../src/layout/relations/check.js";

const source = SourceMapSchema.parse({
  format: 3,
  id: "outcomes",
  title: "Parallel outcomes",
  layers: { work: { label: "Work" } },
  nodes: Object.fromEntries(
    ["start", "quick", "prepare", "finish", "after"].map((id) => [
      id,
      { label: id, layer: "work" },
    ]),
  ),
  edges: {
    quick: { from: "start", to: "quick" },
    prepare: { from: "start", to: "prepare" },
    finish: { from: "prepare", to: "finish" },
    after: { from: "quick", to: "after" },
  },
  scenarios: [
    {
      id: "all",
      label: "All",
      steps: [
        {
          id: "show",
          title: "Show",
          text: "",
          show: ["start", "quick", "prepare", "finish", "after"],
        },
      ],
    },
  ],
  layout: {
    hints: [
      {
        kind: "sameRank",
        strength: "required",
        nodes: ["quick", "finish"],
      },
    ],
  },
});

function problem(direction: "down" | "right") {
  return buildProblem({ ...source, direction }, measureLabel, false);
}

function checkCrossPlacement(
  input: ReturnType<typeof problem>,
  boxes: Awaited<ReturnType<typeof dagreEngine.layout>>["nodes"],
  positions: Record<string, number>,
  axis: number,
) {
  const result = alignBoxes(input, boxes, 64, 32);
  expect(result.status).toBe("determined");
  if (result.status !== "determined") throw new Error(result.status);
  const aligned = result.nodes;
  for (const id of Object.keys(aligned))
    expect(aligned[id][axis]).toBe(positions[id]);
  for (const id of ["start", "prepare"]) expect(aligned[id]).toEqual(boxes[id]);
  const entries = Object.values(aligned);
  for (const [i, a] of entries.entries())
    for (const b of entries.slice(i + 1))
      expect(
        a[0] + a[2] <= b[0] ||
          b[0] + b[2] <= a[0] ||
          a[1] + a[3] <= b[1] ||
          b[1] + b[3] <= a[1],
      ).toBe(true);
}

for (const [name, engine] of [
  ["dagre", dagreEngine],
  ["elk", elkEngine],
] as const) {
  for (const direction of ["down", "right"] as const) {
    test(`${name}, ${direction}: align outcomes and move only their followers`, async () => {
      const input = problem(direction);
      const placed = await engine.layout(problemGraph(input));
      const before = structuredClone({ input, placed });
      const axis = direction === "right" ? 0 : 1;
      const system = rankRelations(input, placed.nodes, 64);
      const solution = solveRelations(system);
      expect(checkRelations(system, solution)).toBe(true);
      expect(solution.status).toBe("determined");
      if (solution.status !== "determined") throw new Error(solution.status);
      const positions = Object.fromEntries(
        solution.placements.map((p) => [p.variable, p.position]),
      );
      expect(placed.nodes.quick[axis]).toBeLessThan(placed.nodes.finish[axis]);
      expect(positions.quick).toBe(placed.nodes.finish[axis]);
      expect(positions.finish).toBe(positions.quick);
      expect(positions.after).toBe(
        positions.quick + placed.nodes.quick[axis + 2] + 64,
      );
      for (const id of ["start", "prepare", "finish"])
        expect(positions[id]).toBe(placed.nodes[id][axis]);
      checkCrossPlacement(input, placed.nodes, positions, axis);
      expect({ input, placed }).toEqual(before);
    });
  }
}

test("a forward path contradiction names its arrows and the hint source", async () => {
  const input = problem("down");
  input.constraints.push({
    kind: "sameRank",
    strength: "required",
    nodes: ["start", "finish"],
    path: "layout.hints[1]",
  });
  const placed = await dagreEngine.layout(problemGraph(input));
  const system = rankRelations(input, placed.nodes, 64);
  const solution = solveRelations(system);
  expect(checkRelations(system, solution)).toBe(true);
  expect(solution.status).toBe("contradictory");
  if (solution.status !== "contradictory") throw new Error(solution.status);
  expect(solution.cycle.map((s) => s.id).sort()).toEqual([
    "edges.finish",
    "edges.prepare",
    "layout.hints[1].nodes[1]",
  ]);
});

function mixedArrows() {
  const input = problem("down");
  input.edges = [
    { id: "forward", from: "start", to: "quick" },
    { id: "free", from: "start", to: "finish" },
    { id: "return", from: "finish", to: "start" },
    { id: "loop", from: "quick", to: "quick" },
    { id: "level", from: "prepare", to: "quick" },
  ];
  input.constraints.push({ kind: "free", strength: "preferred", edge: "free" });
  return rankRelations(
    input,
    {
      start: [0, 0, 60, 36],
      quick: [0, 100, 60, 36],
      prepare: [100, 100, 60, 36],
      finish: [100, 200, 60, 50],
      after: [0, 200, 60, 36],
    },
    64,
  );
}

test("bounds use measured sizes and exclude free, return and self arrows", () => {
  const system = mixedArrows();
  expect(system.anchors).toEqual([
    { id: "rank-origin", variable: "$rank-origin", position: 0 },
  ]);
  expect(system.variables.find((v) => v.id === "finish")).toEqual({
    id: "finish",
    size: 50,
  });
  expect(system.relations.filter((r) => r.id.startsWith("edges."))).toEqual([
    {
      id: "edges.forward",
      from: "start",
      to: "quick",
      kind: "minimum",
      gap: 64,
      size: "start",
    },
  ]);
  expect(system.relations.find((r) => r.id === "engine.finish")).toEqual({
    id: "engine.finish",
    from: "$rank-origin",
    to: "finish",
    kind: "minimum",
    gap: 200,
  });
  expect(system.relations.at(-1)).toEqual({
    id: "layout.hints[0].nodes[1]",
    from: "quick",
    to: "finish",
    kind: "equal",
    gap: 0,
  });
});
