import { expect, test } from "vitest";
import fc from "fast-check";
import type { LayoutProblem } from "../../../src/layout/problem.js";
import type { LayoutResult } from "../../../src/layout/types.js";
import { rankRelations } from "../../../src/layout/relations/rank.js";
import { solveRelations } from "../../../src/layout/relations/solve.js";
import { checkRelations } from "../../../src/layout/relations/check.js";

const cases = fc.integer({ min: 2, max: 8 }).chain((count) =>
  fc.record({
    sizes: fc.array(fc.integer({ min: 20, max: 80 }), {
      minLength: count,
      maxLength: count,
    }),
    edges: fc.uniqueArray(
      fc.tuple(
        fc.integer({ min: 0, max: count - 1 }),
        fc.integer({ min: 0, max: count - 1 }),
      ),
      { maxLength: 20, selector: ([a, b]) => `${a}:${b}` },
    ),
    members: fc.uniqueArray(fc.integer({ min: 0, max: count - 1 }), {
      minLength: 2,
      maxLength: count,
    }),
    right: fc.boolean(),
  }),
);

function generated(input: fc.ArbitraryValue<typeof cases>) {
  const nodes = input.sizes.map((size, i) => ({
    id: `n${i}`,
    width: size,
    height: size,
  }));
  const edges = input.edges.map(([from, to], i) => ({
    id: `e${i}`,
    from: `n${from}`,
    to: `n${to}`,
  }));
  const members = input.members.map((i) => `n${i}`);
  const problem: LayoutProblem = {
    nodes,
    edges,
    groups: [],
    constraints: [
      {
        kind: "direction",
        direction: input.right ? "right" : "down",
        strength: "preferred",
      },
      {
        kind: "sameRank",
        nodes: members,
        strength: "required",
        path: "layout.hints[0]",
      },
    ],
  };
  const boxes: LayoutResult["nodes"] = Object.fromEntries(
    nodes.map((n, i) => [
      n.id,
      input.right
        ? [i * 200, 0, n.width, n.height]
        : [0, i * 200, n.width, n.height],
    ]),
  );
  return { problem, boxes, members, axis: input.right ? 0 : 1 };
}

function reachable(
  problem: LayoutProblem,
  boxes: LayoutResult["nodes"],
  axis: number,
) {
  const paths = new Map(problem.nodes.map((n) => [n.id, new Set<string>()]));
  for (const e of problem.edges)
    if (boxes[e.to][axis] > boxes[e.from][axis]) paths.get(e.from)!.add(e.to);
  for (const middle of problem.nodes)
    for (const from of problem.nodes)
      if (paths.get(from.id)!.has(middle.id))
        for (const to of paths.get(middle.id)!) paths.get(from.id)!.add(to);
  return paths;
}

function verify(input: fc.ArbitraryValue<typeof cases>) {
  const { problem, boxes, members, axis } = generated(input);
  const system = rankRelations(problem, boxes, 64);
  const result = solveRelations(system);
  expect(checkRelations(system, result)).toBe(true);
  const paths = reachable(problem, boxes, axis);
  const conflict = members.some((a) =>
    members.some((b) => paths.get(a)!.has(b)),
  );
  expect(result.status).toBe(conflict ? "contradictory" : "determined");
  if (result.status === "contradictory") {
    expect(result.cycle.some((s) => s.id.startsWith("layout.hints[0]"))).toBe(
      true,
    );
    expect(result.cycle.some((s) => s.id.startsWith("edges."))).toBe(true);
    expect(result.cycle.every((s) => !s.id.startsWith("engine."))).toBe(true);
    return;
  }
  if (result.status !== "determined") throw new Error(result.status);
  const positions = new Map(
    result.placements.map((p) => [p.variable, p.position]),
  );
  expect(new Set(members.map((id) => positions.get(id))).size).toBe(1);
  for (const node of problem.nodes) {
    expect(positions.get(node.id)).toBeGreaterThanOrEqual(boxes[node.id][axis]);
    if (
      !members.includes(node.id) &&
      !members.some((id) => paths.get(id)!.has(node.id))
    )
      expect(positions.get(node.id)).toBe(boxes[node.id][axis]);
  }
  for (const edge of problem.edges)
    if (boxes[edge.to][axis] > boxes[edge.from][axis])
      expect(
        positions.get(edge.to)! - positions.get(edge.from)!,
      ).toBeGreaterThanOrEqual(boxes[edge.from][axis + 2] + 64);
}

test("1,000 small maps align or name a forward-path conflict without moving unrelated boxes", () => {
  fc.assert(fc.property(cases, verify), { numRuns: 1000, seed: 78 });
});
