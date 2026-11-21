import { expect, test } from "vitest";
import fc from "fast-check";
import type { LayoutProblem } from "../../../src/layout/problem.js";
import type { LayoutResult } from "../../../src/layout/types.js";
import { alignBoxes } from "../../../src/layout/relations/align.js";
import { rankRelations } from "../../../src/layout/relations/rank.js";
import { checkRelations } from "../../../src/layout/relations/check.js";

const cases = fc.record({
  sizes: fc.array(fc.integer({ min: 40, max: 90 }), {
    minLength: 2,
    maxLength: 8,
  }),
  pairs: fc.array(fc.tuple(fc.nat(7), fc.nat(7)), { maxLength: 20 }),
  members: fc.uniqueArray(fc.nat(7), { minLength: 2, maxLength: 8 }),
  fraction: fc.integer({ min: 1, max: 999 }),
  right: fc.boolean(),
});

function generated(input: fc.ArbitraryValue<typeof cases>) {
  const nodes = input.sizes.map((size, i) => ({
    id: `n${i}`,
    width: size,
    height: size,
  }));
  const members = [
    ...new Set(input.members.map((i) => nodes[i % nodes.length].id)),
  ];
  if (members.length < 2)
    members.push(nodes.find((n) => n.id !== members[0])!.id);
  const edges = input.pairs.map(([a, b], i) => ({
    id: `e${i}`,
    from: nodes[a % nodes.length].id,
    to: nodes[b % nodes.length].id,
  }));
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
  const boxes = generatedBoxes(input, nodes);
  return { problem, boxes, members, axis: input.right ? 0 : 1 };
}

function generatedBoxes(
  input: fc.ArbitraryValue<typeof cases>,
  nodes: LayoutProblem["nodes"],
): LayoutResult["nodes"] {
  return Object.fromEntries(
    nodes.map((n, i) => {
      const rank = i * 200 + input.fraction / 1000;
      const cross = i * 100 + input.fraction / 1000;
      return [
        n.id,
        input.right
          ? [rank, cross, n.width, n.height]
          : [cross, rank, n.width, n.height],
      ];
    }),
  );
}

function followers(
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

function verifyBoxes(
  original: LayoutResult["nodes"],
  placed: LayoutResult["nodes"],
  axis: number,
) {
  for (const [id, b] of Object.entries(placed)) {
    expect(b[0]).toBeGreaterThanOrEqual(original[id][0]);
    expect(b[1]).toBeGreaterThanOrEqual(original[id][1]);
    expect(b.slice(2)).toEqual(original[id].slice(2));
  }
  const entries = Object.values(placed);
  for (const [i, a] of entries.entries())
    for (const b of entries.slice(i + 1)) {
      if (a[axis] >= b[axis] + b[axis + 2] || b[axis] >= a[axis] + a[axis + 2])
        continue;
      const cross = 1 - axis;
      expect(b[cross]).toBeGreaterThanOrEqual(a[cross] + a[cross + 2] + 32);
    }
}

function verify(input: fc.ArbitraryValue<typeof cases>) {
  const { problem, boxes, members, axis } = generated(input);
  const before = structuredClone({ problem, boxes });
  const paths = followers(problem, boxes, axis);
  const conflict = members.some((a) =>
    members.some((b) => paths.get(a)!.has(b)),
  );
  const result = alignBoxes(problem, boxes, 64, 32);
  expect({ problem, boxes }).toEqual(before);
  expect(result.status).toBe(conflict ? "contradictory" : "determined");
  if (result.status === "contradictory") {
    expect(checkRelations(rankRelations(problem, boxes, 64), result)).toBe(
      true,
    );
    expect(result.cycle.some((r) => r.id.startsWith("layout.hints[0]"))).toBe(
      true,
    );
    expect(result.cycle.some((r) => r.id.startsWith("edges."))).toBe(true);
    return;
  }
  expect(new Set(members.map((id) => result.nodes[id][axis])).size).toBe(1);
  verifyBoxes(boxes, result.nodes, axis);
  for (const { id } of problem.nodes)
    if (!members.includes(id) && !members.some((m) => paths.get(m)!.has(id)))
      expect(result.nodes[id][axis]).toBe(boxes[id][axis]);
  for (const e of problem.edges)
    if (boxes[e.to][axis] > boxes[e.from][axis])
      expect(result.nodes[e.to][axis]).toBeGreaterThanOrEqual(
        result.nodes[e.from][axis] + boxes[e.from][axis + 2] + 64,
      );
}

test("1,000 fractional placements align or name conflicts while preserving bounds and unforced ranks", () => {
  fc.assert(fc.property(cases, verify), { numRuns: 1000, seed: 7803 });
});
