import { expect, test } from "vitest";
import type { LayoutProblem } from "../../../src/layout/problem.js";
import type { LayoutResult } from "../../../src/layout/types.js";
import { pinAnchors } from "../../../src/layout/relations/pin-anchors.js";
import { rankRelations } from "../../../src/layout/relations/rank.js";
import { crossRelations } from "../../../src/layout/relations/cross.js";

const boxes: LayoutResult["nodes"] = {
  cashier: [10, 20, 80, 40],
  guest: [100, 90, 60, 20],
};
const problem: LayoutProblem = {
  nodes: [
    { id: "cashier", width: 80, height: 40 },
    { id: "guest", width: 60, height: 20 },
  ],
  edges: [],
  groups: [],
  constraints: [
    {
      kind: "pin",
      node: "cashier",
      position: [240, 120],
      strength: "required",
      path: "layout.hints[0]",
    },
    {
      kind: "pin",
      node: "guest",
      position: [80, 120],
      strength: "preferred",
      path: "layout.hints[1]",
    },
  ],
};

test("required centre pins become source-named fixed top-left coordinates", () => {
  const before = structuredClone({ problem, boxes });
  expect(pinAnchors(problem, boxes, 0)).toEqual([
    { id: "layout.hints[0]", variable: "cashier", position: 200 },
  ]);
  expect(pinAnchors(problem, boxes, 1)).toEqual([
    { id: "layout.hints[0]", variable: "cashier", position: 100 },
  ]);
  expect({ problem, boxes }).toEqual(before);
});

test("both relation axes fix required pins and release their engine minima", () => {
  const rank = rankRelations(problem, boxes, 20);
  const cross = crossRelations(problem, boxes, 10);
  expect(rank.anchors).toContainEqual({
    id: "layout.hints[0]",
    variable: "cashier",
    position: 100,
  });
  expect(cross.anchors).toContainEqual({
    id: "layout.hints[0]",
    variable: "cashier",
    position: 200,
  });
  for (const system of [rank, cross]) {
    expect(system.relations.some((r) => r.id === "engine.cashier")).toBe(false);
    expect(system.relations.some((r) => r.id === "engine.guest")).toBe(true);
  }
});

test("an engine-forward arrow does not separate two required pins", () => {
  const edge = { id: "owns", from: "cashier", to: "guest" };
  const pinned: LayoutProblem = {
    ...problem,
    edges: [edge],
    constraints: problem.constraints.map((hint) =>
      hint.kind === "pin" ? { ...hint, strength: "required" } : hint,
    ),
  };
  const system = rankRelations(pinned, boxes, 20);
  expect(system.relations).not.toContainEqual(
    expect.objectContaining({ id: "edges.owns" }),
  );
  expect(
    rankRelations({ ...problem, edges: [edge] }, boxes, 20).relations,
  ).toContainEqual(expect.objectContaining({ id: "edges.owns" }));
});
