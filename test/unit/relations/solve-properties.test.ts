import { expect, it } from "vitest";
import fc from "fast-check";
import { normalizeRelations } from "../../../src/layout/relations/normalize.js";
import { solveRelations } from "../../../src/layout/relations/solve.js";
import type {
  RelationEdge,
  RelationGraph,
  RelationSource,
} from "../../../src/layout/relations/types.js";
import type { RelationSolution } from "../../../src/layout/relations/result.js";
import { enumerate, holds, systems } from "./systems.js";

it("satisfies every relation and anchor in every feasible placement", () => {
  fc.assert(
    fc.property(systems, (system) => {
      const result = solveRelations(system);
      if (result.status === "contradictory") return;
      const coordinates = new Map(
        result.placements.map((p) => [p.variable, p.position]),
      );
      expect(holds(system, coordinates)).toBe(true);
      if (result.status === "underdetermined") {
        expect(result.shift.variables.length).toBeGreaterThan(0);
        for (const id of result.shift.variables)
          coordinates.set(id, coordinates.get(id)! + result.shift.delta);
        expect(holds(system, coordinates)).toBe(true);
      }
    }),
    { numRuns: 1000, seed: 71 },
  );
});

it("finds the componentwise minimum and decreasing any coordinate breaks a bound", () => {
  fc.assert(
    fc.property(systems, (system) => {
      const result = solveRelations(system);
      if (result.status !== "determined") return;
      const minimum = enumerate(normalizeRelations(system)).fromOrigin.slice(1);
      expect(result.placements.map((p) => p.position * 64)).toEqual(minimum);
      for (const lowered of result.placements) {
        const coordinates = new Map(
          result.placements.map((p) => [p.variable, p.position]),
        );
        coordinates.set(lowered.variable, lowered.position - 1 / 64);
        expect(holds(system, coordinates)).toBe(false);
      }
    }),
    { numRuns: 1000, seed: 72 },
  );
});

it("keeps status and feasible coordinates under random relation permutations", () => {
  fc.assert(
    fc.property(
      systems.chain((system) =>
        fc
          .shuffledSubarray(system.relations, {
            minLength: system.relations.length,
            maxLength: system.relations.length,
          })
          .map((relations) => ({ system, permuted: { ...system, relations } })),
      ),
      ({ system, permuted }) => {
        const a = solveRelations(system);
        const b = solveRelations(permuted);
        expect(b.status).toBe(a.status);
        if (a.status !== "contradictory" && b.status !== "contradictory") {
          expect(b.placements.map((p) => p.position)).toEqual(
            a.placements.map((p) => p.position),
          );
        }
      },
    ),
    { numRuns: 1000, seed: 73 },
  );
});

it("finds contradictions exactly when exhaustive simple cycles include a positive one", () => {
  fc.assert(
    fc.property(systems, (system) => {
      const result = solveRelations(system);
      const exhaustive = enumerate(normalizeRelations(system));
      expect(result.status === "contradictory").toBe(exhaustive.positiveCycle);
      if (!exhaustive.positiveCycle) {
        expect(result.status === "underdetermined").toBe(
          exhaustive.fromOrigin.includes(-Infinity),
        );
      }
    }),
    { numRuns: 1000, seed: 74 },
  );
});

function sourceEdge(
  graph: RelationGraph,
  source: RelationSource,
): RelationEdge {
  const edge = graph.edges.find(
    (e) =>
      e.source.kind === source.kind &&
      e.source.id === source.id &&
      e.source.reverse === source.reverse,
  );
  expect(edge).toBeDefined();
  return edge!;
}

function expectCycle(
  graph: RelationGraph,
  result: Extract<RelationSolution, { status: "contradictory" }>,
) {
  const cycle = result.cycle.map((s) => sourceEdge(graph, s));
  expect(cycle.length).toBeGreaterThan(0);
  cycle.forEach((e, i) =>
    expect(e.to).toBe(cycle[(i + 1) % cycle.length].from),
  );
  expect(cycle.reduce((sum, e) => sum + e.weight, 0)).toBe(result.sum * 64);
  expect(result.sum).toBeGreaterThan(0);
}

function expectChains(
  graph: RelationGraph,
  result: Extract<RelationSolution, { status: "determined" }>,
) {
  const values = [0, ...result.placements.map((p) => p.position * 64)];
  for (const [i, p] of result.placements.entries()) {
    const chain = p.chain.map((s) => sourceEdge(graph, s));
    expect(chain[0].from).toBe(0);
    expect(chain.at(-1)!.to).toBe(i + 1);
    chain.forEach((e, j) => {
      if (j) expect(e.from).toBe(chain[j - 1].to);
      expect(values[e.to] - values[e.from]).toBe(e.weight);
    });
    expect(chain.reduce((sum, e) => sum + e.weight, 0)).toBe(p.position * 64);
  }
}

it("produces connected source-backed cycles and tight chains with exact sums", () => {
  fc.assert(
    fc.property(systems, (system) => {
      const result = solveRelations(system);
      const graph = normalizeRelations(system);
      if (result.status === "contradictory") expectCycle(graph, result);
      if (result.status === "determined") expectChains(graph, result);
    }),
    { numRuns: 1000, seed: 75 },
  );
});
