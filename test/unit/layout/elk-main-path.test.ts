import { expect, test } from "vitest";
import { asPlacer } from "../../../src/layout/legacy";
import { place } from "../../../src/layout/place";
import { elkEngine } from "../../../src/layout/elk";
import type { LayoutProblem } from "../../../src/layout/problem";

for (const direction of ["down", "right"] as const)
  test(`elk straightens the preferred branch toward ${direction}`, async () => {
    const problem: LayoutProblem = {
      nodes: ["a", "b", "c", "d"].map((id) => ({
        id,
        width: 80,
        height: 40,
      })),
      edges: [
        ["a", "b"],
        ["a", "c"],
        ["b", "d"],
        ["c", "d"],
      ].map(([from, to]) => ({ id: from + to, from, to })),
      groups: [],
      constraints: [{ kind: "direction", strength: "preferred", direction }],
    };
    const placer = asPlacer(elkEngine);
    for (const branch of ["b", "c"]) {
      const input: LayoutProblem = {
        ...problem,
        constraints: [
          ...problem.constraints,
          {
            kind: "mainPath",
            strength: "preferred",
            edges: ["a" + branch, branch + "d"],
          },
        ],
      };
      const before = structuredClone(input);
      const outcome = await place(input, placer);
      if (outcome.kind !== "placed") throw new Error(outcome.message);
      const points = outcome.result.edges[branch + "d"].points;
      const crossAxis = direction === "right" ? 1 : 0;
      // The selected branch reaches the join without turning across the axis.
      expect(new Set(points.map((p) => p[crossAxis])).size).toBe(1);
      expect(outcome.unsupported).toEqual([]);
      expect(input).toEqual(before);
      expect(await place(input, placer)).toEqual(outcome);
    }
  });
