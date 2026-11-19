import { expect, it } from "vitest";
import fc from "fast-check";
import { checkRelations } from "../../../src/layout/relations/check.js";
import type { RelationSolution } from "../../../src/layout/relations/result.js";
import { solveRelations } from "../../../src/layout/relations/solve.js";
import {
  determined,
  freeSystem,
  source,
  system,
  underdetermined,
} from "./check-fixtures.js";
import { systems } from "./systems.js";

it.each([null, {}, { status: "unknown" }, { status: "determined" }])(
  "rejects a malformed claim: %s",
  (claim) => {
    expect(checkRelations(system, claim as RelationSolution)).toBe(false);
  },
);

it.each(["1", true, [1]])(
  "does not coerce a forged coordinate into a number: %s",
  (position) => {
    const claim = determined();
    Object.assign(claim.placements[1], { position });
    expect(checkRelations(system, claim)).toBe(false);
  },
);

it("does not accept a chain when another required bound is violated", () => {
  const input = {
    ...system,
    relations: [
      ...system.relations,
      { id: "ac", from: "a", to: "c", gap: 4, kind: "minimum" as const },
    ],
  };
  expect(checkRelations(input, determined())).toBe(false);
});

it("checks conflicting anchors without requiring a relation in the cycle", () => {
  const input = {
    ...system,
    anchors: [...system.anchors, { id: "other", variable: "a", position: -1 }],
  };
  const claim: RelationSolution = {
    status: "contradictory",
    sum: 1,
    cycle: [source("pin"), { kind: "anchor", id: "other", reverse: true }],
  };
  expect(checkRelations(input, claim)).toBe(true);
  claim.cycle[1].kind = "relation";
  expect(checkRelations(input, claim)).toBe(false);
});

it("checks large free coordinates and shifted values with exact arithmetic", () => {
  const input = {
    ...freeSystem,
    relations: [{ ...freeSystem.relations[0], gap: 0 }],
  };
  const claim = underdetermined();
  claim.placements[1].position = -Number.MAX_SAFE_INTEGER / 64;
  claim.placements[2].position = -Number.MAX_SAFE_INTEGER / 64;
  claim.shift.delta = -Number.MAX_SAFE_INTEGER / 64;
  expect(checkRelations(input, claim)).toBe(true);
  claim.placements[2].position += 1 / 64;
  expect(checkRelations(input, claim)).toBe(false);
});

it("accepts solver witnesses with large mixed-sign source values", () => {
  fc.assert(
    fc.property(systems, (input) => {
      const scale = 2 ** 38;
      const scaled = {
        variables: input.variables.map((v) => ({ ...v, size: v.size * scale })),
        anchors: input.anchors.map((a) => ({
          ...a,
          position: a.position * scale,
        })),
        relations: input.relations.map((r) => ({ ...r, gap: r.gap * scale })),
      };
      expect(checkRelations(scaled, solveRelations(scaled))).toBe(true);
    }),
    { numRuns: 1000, seed: 80 },
  );
});

it("rejects a sparse shift set that names no movable box", () => {
  const fixed = {
    variables: [{ id: "a", size: 0 }],
    anchors: [{ id: "pin", variable: "a", position: 0 }],
    relations: [],
  };
  const claim: RelationSolution = {
    status: "underdetermined",
    placements: [{ variable: "a", position: 0 }],
    shift: { variables: new Array<string>(1), delta: -1 / 64 },
  };
  expect(checkRelations(fixed, claim)).toBe(false);
});
