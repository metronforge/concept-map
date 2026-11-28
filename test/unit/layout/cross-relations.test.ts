import { expect, test } from "vitest";
import type { LayoutProblem, Direction } from "../../../src/layout/problem.js";
import type { LayoutResult } from "../../../src/layout/types.js";
import { crossRelations } from "../../../src/layout/relations/cross.js";
import { solveRelations } from "../../../src/layout/relations/solve.js";
import { checkRelations } from "../../../src/layout/relations/check.js";

function input(
  boxes: LayoutResult["nodes"],
  direction: Direction,
): LayoutProblem {
  return {
    nodes: Object.entries(boxes).map(([id, b]) => ({
      id,
      width: b[2],
      height: b[3],
    })),
    edges: [],
    groups: [],
    constraints: [{ kind: "direction", direction, strength: "preferred" }],
  };
}

function positions(boxes: LayoutResult["nodes"], direction: Direction) {
  const problem = input(boxes, direction);
  const before = structuredClone({ problem, boxes });
  const system = crossRelations(problem, boxes, 32);
  const result = solveRelations(system);
  expect(checkRelations(system, result)).toBe(true);
  expect(result.status).toBe("determined");
  if (result.status !== "determined") throw new Error(result.status);
  expect({ problem, boxes }).toEqual(before);
  return Object.fromEntries(
    result.placements
      .filter((p) => p.variable in boxes)
      .map((p) => [p.variable, p.position]),
  );
}

for (const direction of ["down", "right"] as const) {
  function orient(boxes: LayoutResult["nodes"]): LayoutResult["nodes"] {
    return Object.fromEntries(
      Object.entries(boxes).map(([id, [x, y, w, h]]) => [
        id,
        direction === "down" ? [x, y, w, h] : [y, x, h, w],
      ]),
    );
  }

  test(`${direction}: separate rank overlaps and propagate the minimum movement`, () => {
    const boxes = orient({
      a: [10, 100, 60, 36],
      b: [20, 120, 40, 36],
      c: [90, 140, 80, 36],
      clear: [400, 120, 40, 36],
      separate: [30, 300, 40, 36],
    });
    expect(positions(boxes, direction)).toEqual({
      a: 10,
      b: 102,
      c: 174,
      clear: 400,
      separate: 30,
    });
  });

  test(`${direction}: contained ranks separate but touching ranks do not`, () => {
    const boxes = orient({
      outer: [0, 100, 60, 100],
      inner: [10, 120, 40, 36],
      touching: [10, 200, 40, 36],
    });
    expect(positions(boxes, direction)).toEqual({
      outer: 0,
      inner: 92,
      touching: 10,
    });
  });

  test(`${direction}: tied cross coordinates use node ids independent of input order`, () => {
    const boxes = orient({ b: [0, 100, 60, 36], a: [0, 100, 40, 36] });
    expect(positions(boxes, direction)).toEqual({ a: 0, b: 72 });
    expect(
      positions(Object.fromEntries(Object.entries(boxes).reverse()), direction),
    ).toEqual({ a: 0, b: 72 });
  });
}

test("an empty map has a checked origin and no box positions", () => {
  expect(positions({}, "down")).toEqual({});
});

test("overlapping required pins do not force cross-axis separation", () => {
  const boxes: LayoutResult["nodes"] = {
    a: [0, 100, 40, 40],
    b: [20, 110, 40, 40],
    c: [30, 120, 40, 40],
  };
  const problem = input(boxes, "down");
  problem.constraints.push(
    { kind: "pin", node: "a", position: [20, 120], strength: "required" },
    { kind: "pin", node: "b", position: [40, 130], strength: "required" },
  );
  const system = crossRelations(problem, boxes, 32);
  expect(system.relations.some((r) => r.id === "separate.a:b")).toBe(false);
  expect(system.relations.some((r) => r.id === "separate.a:c")).toBe(true);
  expect(system.relations.some((r) => r.id === "separate.b:c")).toBe(true);
  const result = solveRelations(system);
  expect(checkRelations(system, result)).toBe(true);
  expect(result.status).toBe("determined");
});
