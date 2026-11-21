import { expect, test } from "vitest";
import fc from "fast-check";
import type { LayoutProblem } from "../../../src/layout/problem.js";
import type { LayoutResult } from "../../../src/layout/types.js";
import { crossRelations } from "../../../src/layout/relations/cross.js";
import { solveRelations } from "../../../src/layout/relations/solve.js";
import { checkRelations } from "../../../src/layout/relations/check.js";

const cases = fc.record({
  boxes: fc.array(
    fc.tuple(
      fc.integer({ min: -100, max: 400 }),
      fc.integer({ min: -100, max: 400 }),
      fc.integer({ min: 1, max: 100 }),
      fc.integer({ min: 1, max: 100 }),
    ),
    { maxLength: 10 },
  ),
  right: fc.boolean(),
  gap: fc.integer({ min: 0, max: 64 }),
});

function verify(input: fc.ArbitraryValue<typeof cases>) {
  const boxes: LayoutResult["nodes"] = Object.fromEntries(
    input.boxes.map((box, i) => [`n${i}`, box]),
  );
  const problem: LayoutProblem = {
    nodes: input.boxes.map((box, i) => ({
      id: `n${i}`,
      width: box[2],
      height: box[3],
    })),
    edges: [],
    groups: [],
    constraints: [
      {
        kind: "direction",
        direction: input.right ? "right" : "down",
        strength: "preferred",
      },
    ],
  };
  const system = crossRelations(problem, boxes, input.gap);
  const result = solveRelations(system);
  expect(checkRelations(system, result)).toBe(true);
  expect(result.status).toBe("determined");
  if (result.status !== "determined") throw new Error(result.status);
  const positions = Object.fromEntries(
    result.placements.map((p) => [p.variable, p.position]),
  );
  checkGeometry(input, positions);
}

function checkGeometry(
  input: fc.ArbitraryValue<typeof cases>,
  positions: Record<string, number>,
) {
  const cross = input.right ? 1 : 0;
  const rank = 1 - cross;
  input.boxes.forEach((box, i) => {
    const overlaps = input.boxes.filter(
      (other, j) =>
        i !== j &&
        Math.min(box[rank] + box[rank + 2], other[rank] + other[rank + 2]) >
          Math.max(box[rank], other[rank]),
    );
    expect(positions[`n${i}`]).toBeGreaterThanOrEqual(box[cross]);
    if (!overlaps.length) expect(positions[`n${i}`]).toBe(box[cross]);
    input.boxes.forEach((other, j) => {
      if (i >= j || !overlaps.includes(other)) return;
      const first = box[cross] <= other[cross] ? i : j;
      const last = first === i ? j : i;
      expect(
        positions[`n${last}`] - positions[`n${first}`],
      ).toBeGreaterThanOrEqual(input.boxes[first][cross + 2] + input.gap);
    });
  });
}

test("1,000 cross-axis systems separate rank overlaps without backward or unrelated movement", () => {
  fc.assert(fc.property(cases, verify), { numRuns: 1000, seed: 78 });
});
