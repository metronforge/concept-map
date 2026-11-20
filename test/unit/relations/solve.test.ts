import { expect, it } from "vitest";
import { solveRelations } from "../../../src/layout/relations/solve.js";
import type { RelationSystem } from "../../../src/layout/relations/types.js";

function input(): RelationSystem {
  return {
    variables: [
      { id: "a", size: 10 },
      { id: "b", size: 20 },
      { id: "c", size: 0 },
    ],
    anchors: [
      { id: "first", variable: "a", position: 0 },
      { id: "second", variable: "b", position: 0 },
    ],
    relations: [
      { id: "narrow", from: "a", to: "c", kind: "minimum", gap: 2, size: "a" },
      { id: "wide", from: "b", to: "c", kind: "minimum", gap: 2, size: "b" },
    ],
  };
}

it("places a box behind the wider of two predecessors with a tight chain", () => {
  const result = solveRelations(input());
  expect(result.status).toBe("determined");
  if (result.status !== "determined") throw new Error(result.status);
  expect(result.placements.map((p) => p.position)).toEqual([0, 0, 22]);
  expect(result.placements[2].chain).toEqual([
    { kind: "anchor", id: "second", reverse: false },
    { kind: "relation", id: "wide", reverse: false },
  ]);
});

it("reports all three ids of a positive cycle", () => {
  const system = input();
  system.anchors.length = 1;
  system.relations = [
    { id: "ab", from: "a", to: "b", kind: "minimum", gap: 1 },
    { id: "bc", from: "b", to: "c", kind: "minimum", gap: 1 },
    { id: "ca", from: "c", to: "a", kind: "minimum", gap: -1 },
  ];
  const result = solveRelations(system);
  expect(result.status).toBe("contradictory");
  if (result.status !== "contradictory") throw new Error(result.status);
  expect(result.cycle.map((r) => r.id).sort()).toEqual(["ab", "bc", "ca"]);
  expect(result.sum).toBe(1);
});

it("finds a contradiction even when no anchor reaches its component", () => {
  const system = input();
  system.anchors.length = 1;
  system.relations = [
    { id: "bc", from: "b", to: "c", kind: "equal", gap: 1 },
    { id: "cb", from: "c", to: "b", kind: "minimum", gap: 0 },
  ];
  expect(solveRelations(system).status).toBe("contradictory");
});

it("returns a downward shift for boxes constrained only by upper bounds", () => {
  const system = input();
  system.anchors.length = 1;
  system.relations = [
    { id: "ba", from: "b", to: "a", kind: "minimum", gap: 2 },
    { id: "bc", from: "b", to: "c", kind: "equal", gap: 3 },
  ];
  const result = solveRelations(system);
  expect(result.status).toBe("underdetermined");
  if (result.status !== "underdetermined") throw new Error(result.status);
  expect(result.shift).toEqual({ variables: ["b", "c"], delta: -1 / 64 });
  const positions = Object.fromEntries(
    result.placements.map((p) => [p.variable, p.position]),
  );
  expect(positions.a).toBe(0);
  expect(positions.b).toBeLessThanOrEqual(-2);
  expect(positions.c - positions.b).toBe(3);
});

it("keeps negative coordinates and builds finite chains through zero cycles", () => {
  const system = input();
  system.anchors = [{ id: "start", variable: "c", position: -1 / 64 }];
  system.relations = [
    { id: "ab", from: "a", to: "b", kind: "equal", gap: 0 },
    { id: "bc", from: "b", to: "c", kind: "equal", gap: 2 },
  ];
  const result = solveRelations(system);
  expect(result.status).toBe("determined");
  if (result.status !== "determined") throw new Error(result.status);
  expect(result.placements.map((p) => p.position)).toEqual([
    -129 / 64,
    -129 / 64,
    -1 / 64,
  ]);
  expect(result.placements[0].chain.map((r) => [r.id, r.reverse])).toEqual([
    ["start", false],
    ["bc", true],
    ["ab", true],
  ]);
});

it("reports conflicting fixed anchors", () => {
  const system = input();
  system.anchors.push({ id: "conflict", variable: "a", position: 1 / 64 });
  expect(solveRelations(system).status).toBe("contradictory");
});

it("does not mutate input and preserves ids that name object properties", () => {
  const system: RelationSystem = {
    variables: [{ id: "__proto__", size: 0 }],
    anchors: [{ id: "constructor", variable: "__proto__", position: 0 }],
    relations: [],
  };
  const before = structuredClone(system);
  const result = solveRelations(system);
  expect(result.status).toBe("determined");
  if (result.status !== "determined") throw new Error(result.status);
  expect(result.placements[0].variable).toBe("__proto__");
  expect(system).toEqual(before);
  expect(solveRelations(system)).toEqual(result);
});
