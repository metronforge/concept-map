import { expect, test } from "vitest";
import { asPlacer } from "../../../src/layout/legacy";
import { place } from "../../../src/layout/place";
import { elkEngine } from "../../../src/layout/elk";
import type { LayoutProblem } from "../../../src/layout/problem";

for (const engine of [elkEngine])
  for (const direction of ["down", "right"] as const)
    test(`${engine.name} starts a cycle at the first scenario node toward ${direction}`, async () => {
      const problem: LayoutProblem = {
        nodes: ["c", "b", "a"].map((id) => ({ id, width: 80, height: 40 })),
        edges: [
          { id: "ca", from: "c", to: "a" },
          { id: "ab", from: "a", to: "b" },
          { id: "bc", from: "b", to: "c" },
          { id: "cb", from: "c", to: "b" },
        ],
        groups: [],
        constraints: [
          { kind: "direction", strength: "preferred", direction },
          { kind: "order", strength: "preferred", nodes: ["a", "b", "c"] },
          { kind: "mainPath", strength: "preferred", edges: ["ab", "bc"] },
        ],
      };
      const before = structuredClone(problem);
      const outcome = await place(problem, asPlacer(engine));
      if (outcome.kind !== "placed") throw new Error(outcome.message);
      const { nodes, edges } = outcome.result;
      const axis = direction === "right" ? 0 : 1;
      expect(nodes.a[axis] + nodes.a[axis + 2]).toBeLessThan(nodes.b[axis]);
      expect(nodes.b[axis] + nodes.b[axis + 2]).toBeLessThan(nodes.c[axis]);
      expect(edges.ca.points[0][axis]).toBeGreaterThan(
        edges.ca.points.at(-1)![axis],
      );
      expect(outcome.unsupported).toEqual([]);
      expect(problem).toEqual(before);
      expect(await place(problem, asPlacer(engine))).toEqual(outcome);
    });

for (const direction of ["down", "right"] as const)
  test(`ELK keeps required lanes ahead of scenario order toward ${direction}`, async () => {
    const problem: LayoutProblem = {
      nodes: ["a", "b", "c"].map((id) => ({
        id,
        width: 80,
        height: 40,
        lane: id === "b" ? "second" : "first",
      })),
      edges: [
        { id: "ab", from: "a", to: "b" },
        { id: "bc", from: "b", to: "c" },
      ],
      groups: ["first", "second"].map((id) => ({
        id,
        label: { width: 50, height: 12 },
      })),
      constraints: [
        { kind: "direction", strength: "preferred", direction },
        {
          kind: "lanes",
          strength: "required",
          direction,
          lanes: ["first", "second"],
        },
        { kind: "order", strength: "preferred", nodes: ["a", "b", "c"] },
      ],
    };
    const outcome = await place(problem, asPlacer(elkEngine));
    if (outcome.kind !== "placed") throw new Error(outcome.message);
    const axis = direction === "right" ? 0 : 1;
    for (const id of ["a", "c"])
      expect(
        outcome.result.nodes[id][axis] + outcome.result.nodes[id][axis + 2],
      ).toBeLessThan(outcome.result.nodes.b[axis]);
    expect(outcome.unsupported).toEqual([]);
  });
