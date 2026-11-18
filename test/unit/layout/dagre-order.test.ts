import { expect, test } from "vitest";
import { asPlacer } from "../../../src/layout/legacy";
import { place } from "../../../src/layout/place";
import { dagreEngine } from "../../../src/layout/dagre";
import type { LayoutProblem } from "../../../src/layout/problem";

for (const direction of ["down", "right"] as const)
  test(`dagre starts a cycle at the first scenario node toward ${direction}`, async () => {
    const problem: LayoutProblem = {
      nodes: ["c", "b", "a"].map((id) => ({ id, width: 80, height: 40 })),
      edges: [
        { id: "ca", from: "c", to: "a" },
        { id: "ab", from: "a", to: "b" },
        { id: "bc", from: "b", to: "c" },
      ],
      groups: [],
      constraints: [
        { kind: "direction", strength: "preferred", direction },
        { kind: "order", strength: "preferred", nodes: ["a", "b", "c"] },
        { kind: "mainPath", strength: "preferred", edges: ["ab", "bc"] },
        { kind: "free", strength: "preferred", edge: "ca" },
      ],
    };
    const before = structuredClone(problem);
    const outcome = await place(problem, asPlacer(dagreEngine));
    if (outcome.kind !== "placed") throw new Error(outcome.message);
    const { nodes, edges } = outcome.result;
    const axis = direction === "right" ? 0 : 1;
    expect(nodes.a[axis] + nodes.a[axis + 2]).toBeLessThan(nodes.b[axis]);
    expect(nodes.b[axis] + nodes.b[axis + 2]).toBeLessThan(nodes.c[axis]);
    expect(edges.ca.points[0][axis]).toBeGreaterThan(
      edges.ca.points.at(-1)![axis],
    );
    expect(outcome.unsupported).toEqual(problem.constraints.slice(2));
    expect(problem).toEqual(before);
    expect(await place(problem, asPlacer(dagreEngine))).toEqual(outcome);
  });
