import { expect, it } from "vitest";
import fc from "fast-check";
import { explainRelations } from "../../../src/layout/relations/explain.js";
import { checkRelations } from "../../../src/layout/relations/check.js";
import { normalizeRelations } from "../../../src/layout/relations/normalize.js";
import { solveRelations } from "../../../src/layout/relations/solve.js";
import type {
  RelationGraph,
  RelationSystem,
} from "../../../src/layout/relations/types.js";
import { enumerate, systems } from "./systems.js";

/** Enumerate every simple path, without relaxation or the solver's state. */
function bestPath(graph: RelationGraph, from: number, to: number): number {
  let best = -Infinity;
  function visit(vertex: number, sum: number, seen: Set<number>) {
    if (vertex === to) best = Math.max(best, sum);
    for (const edge of graph.edges) {
      if (edge.from === vertex && !seen.has(edge.to))
        visit(edge.to, sum + edge.weight, new Set([...seen, edge.to]));
    }
  }
  visit(from, 0, new Set([from]));
  return best;
}

function expectedVerdicts(system: RelationSystem) {
  let prior = normalizeRelations({ ...system, relations: [] });
  const verdicts: { id: string; status: string }[] = [];
  if (enumerate(prior).positiveCycle) return verdicts;
  for (const [i, relation] of system.relations.entries()) {
    const next = normalizeRelations({
      ...system,
      relations: system.relations.slice(0, i + 1),
    });
    const added = next.edges.filter(
      (e) => e.source.kind === "relation" && e.source.id === relation.id,
    );
    const status = enumerate(next).positiveCycle
      ? "contradicts"
      : added.every((e) => bestPath(prior, e.from, e.to) >= e.weight)
        ? "redundant"
        : "adds-information";
    verdicts.push({ id: relation.id, status });
    if (status === "contradicts") break;
    prior = next;
  }
  return verdicts;
}

it("matches exhaustive implication and positive-cycle checks for every prefix", () => {
  fc.assert(
    fc.property(systems, (system) => {
      expect(explainRelations(system).verdicts).toEqual(
        expectedVerdicts(system),
      );
    }),
    { numRuns: 1000, seed: 81 },
  );
});

it("carries an independently accepted witness using only judged relations", () => {
  fc.assert(
    fc.property(systems, (system) => {
      const before = structuredClone(system);
      const report = explainRelations(system);
      const prefix = {
        ...system,
        relations: system.relations.slice(0, report.verdicts.length),
      };
      expect(checkRelations(prefix, report.solution)).toBe(true);
      expect(checkRelations(system, report.solution)).toBe(true);
      expect(report.solution.status).toBe(solveRelations(system).status);
      expect(system).toEqual(before);
      expect(explainRelations(system)).toEqual(report);
    }),
    { numRuns: 1000, seed: 82 },
  );
});

it("preserves status and feasible coordinates when relations are reordered", () => {
  fc.assert(
    fc.property(systems, fc.integer(), (system, seed) => {
      const shuffled = fc.sample(
        fc.shuffledSubarray(system.relations, {
          minLength: system.relations.length,
          maxLength: system.relations.length,
        }),
        { seed, numRuns: 1 },
      )[0];
      const before = explainRelations(system).solution;
      const after = explainRelations({
        ...system,
        relations: shuffled,
      }).solution;
      expect(after.status).toBe(before.status);
      if (before.status !== "contradictory" && after.status !== "contradictory")
        expect(after.placements.map((p) => p.position)).toEqual(
          before.placements.map((p) => p.position),
        );
    }),
    { numRuns: 1000, seed: 83 },
  );
});
