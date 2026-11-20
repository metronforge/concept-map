import { expect, it } from "vitest";
import { checkRelations } from "../../../src/layout/relations/check.js";
import {
  determined,
  freeSystem,
  source,
  system,
  underdetermined,
} from "./check-fixtures.js";

it("checks handwritten compact placements independently of placement order", () => {
  const claim = determined();
  claim.placements.reverse();
  expect(checkRelations(system, claim)).toBe(true);
});

it("checks reverse equality bounds in tight anchor chains", () => {
  const input = {
    ...system,
    relations: [
      system.relations[0],
      { ...system.relations[1], from: "c", to: "b", gap: -2 },
    ],
  };
  const claim = determined();
  claim.placements[2].chain[2].reverse = true;
  expect(checkRelations(input, claim)).toBe(true);
});

it("checks separately rounded sizes and negative gaps from the source", () => {
  const input = {
    ...system,
    variables: [{ id: "a", size: 0.001 }, ...system.variables.slice(1)],
    relations: [
      { ...system.relations[0], size: "a", gap: -0.001 },
      system.relations[1],
    ],
  };
  const claim = determined();
  claim.placements[1].position = 1 / 64;
  claim.placements[2].position = 2 + 1 / 64;
  expect(checkRelations(input, claim)).toBe(true);
  claim.placements[1].position = 0;
  claim.placements[2].position = 2;
  expect(checkRelations(input, claim)).toBe(false);
});

it.each([NaN, Infinity, -Infinity, 0.001, Number.MAX_VALUE])(
  "rejects a coordinate outside the exact grid: %s",
  (position) => {
    const claim = determined();
    claim.placements[1].position = position;
    expect(checkRelations(system, claim)).toBe(false);
  },
);

it("rejects missing, repeated and unknown placements", () => {
  const claim = determined();
  claim.placements.pop();
  expect(checkRelations(system, claim)).toBe(false);
  claim.placements.push(claim.placements[0]);
  expect(checkRelations(system, claim)).toBe(false);
  claim.placements[2] = { ...claim.placements[2], variable: "missing" };
  expect(checkRelations(system, claim)).toBe(false);
});

it("rejects disconnected chains, reversed inequalities and wrong endpoints", () => {
  for (const chain of [
    [source("ab")],
    [source("pin"), source("ab", true)],
    [source("pin")],
  ]) {
    const claim = determined();
    claim.placements[1].chain = chain;
    expect(checkRelations(system, claim)).toBe(false);
  }
});

it("checks a three-relation cycle with its literal sum", () => {
  const input = {
    ...system,
    relations: [
      ...system.relations,
      { id: "ca", from: "c", to: "a", kind: "minimum" as const, gap: -2 },
    ],
  };
  const claim = {
    status: "contradictory" as const,
    cycle: [source("ab"), source("bc"), source("ca")],
    sum: 1,
  };
  expect(checkRelations(input, claim)).toBe(true);
  expect(
    checkRelations(input, {
      ...claim,
      cycle: [source("ab"), source("ca"), source("bc")],
    }),
  ).toBe(false);
  expect(
    checkRelations(input, { ...claim, cycle: claim.cycle.slice(0, 2), sum: 3 }),
  ).toBe(false);
  expect(checkRelations(input, { ...claim, cycle: [], sum: 0 })).toBe(false);
  expect(
    checkRelations(input, {
      ...claim,
      cycle: [source("bc"), source("bc", true)],
      sum: 0,
    }),
  ).toBe(false);
});

it("accepts a free downward shift but rejects empty, duplicate and partial sets", () => {
  expect(checkRelations(freeSystem, underdetermined())).toBe(true);
  for (const variables of [[], ["b"], ["c"], ["b", "c", "b"], ["missing"]]) {
    const claim = underdetermined();
    claim.shift.variables = variables;
    expect(checkRelations(freeSystem, claim)).toBe(false);
  }
});

it.each([0, 1 / 64, NaN, -0.001])(
  "rejects a shift that is not a negative grid displacement: %s",
  (delta) => {
    const claim = underdetermined();
    claim.shift.delta = delta;
    expect(checkRelations(freeSystem, claim)).toBe(false);
  },
);

it("rejects a finite shift of a bounded but nonminimal placement", () => {
  const claim = underdetermined();
  claim.placements[1].position = 2;
  claim.placements[2].position = 4;
  // Moving b/c down one tick is feasible, but both have a lower bound from a.
  expect(checkRelations(system, claim)).toBe(false);
});

it("rejects underdetermination when the proposed placement violates an equality", () => {
  const claim = underdetermined();
  claim.placements[2].position = 3;
  expect(checkRelations(freeSystem, claim)).toBe(false);
});
