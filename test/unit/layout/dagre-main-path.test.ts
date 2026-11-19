import { expect, test } from "vitest";
import { asPlacer } from "../../../src/layout/legacy";
import { place } from "../../../src/layout/place";
import { dagreEngine } from "../../../src/layout/dagre";
import type { LayoutProblem } from "../../../src/layout/problem";

for (const direction of ["down", "right"] as const)
  for (const returning of [false, true])
    test(`dagre shortens the preferred ${returning ? "return" : "forward"} arrow toward ${direction}`, async () => {
      const problem: LayoutProblem = {
        nodes: ["a", "b", "c", "d", "e"].map((id) => ({
          id,
          width: 80,
          height: 40,
        })),
        edges: [
          ["a", "b"],
          ["b", "c"],
          ["c", "e"],
          returning ? ["d", "a"] : ["a", "d"],
          ["d", "e"],
        ].map(([from, to]) => ({ id: from + to, from, to })),
        groups: [],
        constraints: [
          { kind: "direction", strength: "preferred", direction },
          ...(returning
            ? [{ kind: "free", strength: "preferred", edge: "da" } as const]
            : []),
        ],
      };
      const placer = asPlacer(dagreEngine);
      for (const edge of [returning ? "da" : "ad", "de"]) {
        const input: LayoutProblem = {
          ...problem,
          constraints: [
            ...problem.constraints,
            { kind: "mainPath", strength: "preferred", edges: [edge] },
          ],
        };
        const before = structuredClone(input);
        const outcome = await place(input, placer);
        if (outcome.kind !== "placed") throw new Error(outcome.message);
        const { nodes } = outcome.result;
        const axis = direction === "right" ? 0 : 1;
        const first = nodes.d[axis] - nodes.a[axis];
        const last = nodes.e[axis] - nodes.d[axis];
        if (edge !== "de") expect(first).toBeLessThan(last);
        else expect(last).toBeLessThan(first);
        expect(outcome.unsupported).toEqual([]);
        expect(input).toEqual(before);
        expect(await place(input, placer)).toEqual(outcome);
      }
    });
