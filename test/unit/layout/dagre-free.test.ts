import { expect, test } from "vitest";
import { asPlacer } from "../../../src/layout/legacy";
import { place } from "../../../src/layout/place";
import { elkEngine } from "../../../src/layout/elk";
import { dagreEngine } from "../../../src/layout/dagre";
import type { LayoutProblem } from "../../../src/layout/problem";

for (const engine of [dagreEngine, elkEngine])
  for (const direction of ["down", "right"] as const)
    test(`${engine.name} keeps an acyclic return arrow from ranking its destination last toward ${direction}`, async () => {
      const problem: LayoutProblem = {
        nodes: ["a", "b", "c"].map((id) => ({ id, width: 80, height: 40 })),
        edges: [
          { id: "ab", from: "a", to: "b" },
          {
            id: "ca",
            from: "c",
            to: "a",
            label: { text: "Return", width: 60, height: 20 },
          },
          { id: "cc", from: "c", to: "c" },
        ],
        groups: [],
        constraints: [
          { kind: "direction", strength: "preferred", direction },
          { kind: "order", strength: "preferred", nodes: ["a", "b", "c"] },
          { kind: "free", strength: "preferred", edge: "ca" },
          { kind: "free", strength: "preferred", edge: "cc" },
        ],
      };
      const before = structuredClone(problem);
      const outcome = await place(problem, asPlacer(engine));
      if (outcome.kind !== "placed") throw new Error(outcome.message);
      const { nodes, edges } = outcome.result;
      const axis = direction === "right" ? 0 : 1;
      expect(nodes.a[axis] + nodes.a[axis + 2]).toBeLessThan(nodes.c[axis]);
      expect(nodes.a[axis] + nodes.a[axis + 2]).toBeLessThan(nodes.b[axis]);
      for (const [point, box] of [
        [edges.ca.points[0], nodes.c],
        [edges.ca.points.at(-1)!, nodes.a],
      ] as const) {
        expect(point[0]).toBeGreaterThanOrEqual(box[0]);
        expect(point[0]).toBeLessThanOrEqual(box[0] + box[2]);
        expect(point[1]).toBeGreaterThanOrEqual(box[1]);
        expect(point[1]).toBeLessThanOrEqual(box[1] + box[3]);
      }
      expect(edges.ca.label?.every(Number.isFinite)).toBe(true);
      expect(edges.cc.points.length).toBeGreaterThan(2);
      expect(outcome.unsupported).toEqual([]);
      expect(problem).toEqual(before);
      expect(await place(problem, asPlacer(engine))).toEqual(outcome);
    });
