import { expect, it } from "vitest";
import fc from "fast-check";
import { checkRelations } from "../../../src/layout/relations/check.js";
import { solveRelations } from "../../../src/layout/relations/solve.js";
import { systems } from "./systems.js";

it("accepts every solver witness across all three statuses", () => {
  const statuses = new Set<string>();
  fc.assert(
    fc.property(systems, (system) => {
      const claim = solveRelations(system);
      statuses.add(claim.status);
      expect(checkRelations(system, claim)).toBe(true);
    }),
    { numRuns: 1000, seed: 76 },
  );
  expect(statuses.size).toBe(3);
});

it("rejects shifted coordinates and broken tight chains", () => {
  fc.assert(
    fc.property(systems, (system) => {
      const claim = solveRelations(system);
      if (claim.status !== "determined") return;
      for (const [i] of claim.placements.entries()) {
        const shifted = structuredClone(claim);
        shifted.placements[i].position += 1 / 64;
        expect(checkRelations(system, shifted)).toBe(false);
        const broken = structuredClone(claim);
        broken.placements[i].chain.shift();
        expect(checkRelations(system, broken)).toBe(false);
      }
    }),
    { numRuns: 1000, seed: 77 },
  );
});

it("rejects positive cycles with forged sums or unknown sources", () => {
  fc.assert(
    fc.property(systems, (system) => {
      const claim = solveRelations(system);
      if (claim.status !== "contradictory") return;
      expect(
        checkRelations(system, { ...claim, sum: claim.sum + 1 / 64 }),
      ).toBe(false);
      claim.cycle[0].id = "missing";
      expect(checkRelations(system, claim)).toBe(false);
    }),
    { numRuns: 1000, seed: 78 },
  );
});

it("rejects a shift set that includes a fixed anchor", () => {
  fc.assert(
    fc.property(systems, (system) => {
      const claim = solveRelations(system);
      if (claim.status !== "underdetermined") return;
      claim.shift.variables.push(system.anchors[0].variable);
      expect(checkRelations(system, claim)).toBe(false);
    }),
    { numRuns: 1000, seed: 79 },
  );
});
