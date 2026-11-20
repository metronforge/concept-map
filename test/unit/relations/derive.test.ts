import { expect, it } from "vitest";
import { derivePositions } from "../../../src/layout/relations/derive.js";
import { checkDerivedPositions } from "../../../src/layout/relations/check-derived.js";
import { solveRelations } from "../../../src/layout/relations/solve.js";
import { anchored, endpoints, midpoint } from "./derived-fixtures.js";

it.each([
  [0, 1, 0],
  [0, -1, -1],
  [-1, -2, -2],
  [1, 0, 0],
  [-3, 3, 0],
])("rounds the midpoint of %s and %s ticks to %s", (a, b, expected) => {
  const system = anchored(a, b);
  const claim = [{ variable: "middle", position: expected / 64 }];
  expect(derivePositions(endpoints(a, b), [midpoint])).toEqual(claim);
  expect(
    checkDerivedPositions(system, solveRelations(system), [midpoint], claim),
  ).toBe(true);
});

it("places equal parts on the grid and preserves request order", () => {
  const requests = Array.from({ length: 4 }, (_, part) => ({
    ...midpoint,
    id: `p${part}`,
    part,
    parts: 3,
  }));
  const placements = endpoints(0, 2);
  const before = structuredClone({ placements, requests });
  const claim = derivePositions(placements, requests);
  expect(claim.map(({ position }) => position * 64)).toEqual([0, 1, 1, 2]);
  expect({ placements, requests }).toEqual(before);
  const system = anchored(0, 2);
  expect(
    checkDerivedPositions(
      system,
      solveRelations(system),
      requests,
      claim.reverse(),
    ),
  ).toBe(true);
});

it.each([
  { part: -1 },
  { part: 3 },
  { part: 0.5 },
  { parts: 0 },
  { parts: 1.5 },
  { parts: Infinity },
  { part: NaN },
  { parts: Number.MAX_SAFE_INTEGER + 1 },
  { from: "missing" },
  { id: "a" },
])("rejects invalid derivation input %j", (change) => {
  const requests = [{ ...midpoint, ...change }];
  expect(() => derivePositions(endpoints(0, 1), requests)).toThrow();
  const system = anchored(0, 1);
  expect(
    checkDerivedPositions(system, solveRelations(system), requests, []),
  ).toBe(false);
});

it("rejects repeated ids, chained requests and ambiguous or off-grid endpoints", () => {
  const placements = endpoints(0, 1);
  expect(() => derivePositions(placements, [midpoint, midpoint])).toThrow();
  expect(() =>
    derivePositions(placements, [
      midpoint,
      {
        ...midpoint,
        id: "next",
        from: "middle",
      },
    ]),
  ).toThrow();
  expect(() =>
    derivePositions([...placements, placements[0]], [midpoint]),
  ).toThrow();
  placements[0].position = 1 / 128;
  expect(() => derivePositions(placements, [midpoint])).toThrow();
});

it("rejects forged, missing, repeated, unknown and malformed derived claims", () => {
  const system = anchored(0, 1);
  const solution = solveRelations(system);
  const valid = { variable: "middle", position: 0 };
  const claims = [
    [],
    [valid, valid],
    [{ ...valid, variable: "unknown" }],
    [{ ...valid, position: 1 / 64 }],
    [{ ...valid, position: 1 / 128 }],
    [{ ...valid, position: NaN }],
    Array(1),
    null,
  ];
  for (const claim of claims) {
    expect(checkDerivedPositions(system, solution, [midpoint], claim!)).toBe(
      false,
    );
  }
});

it("checks placement witnesses before trusting their endpoints", () => {
  const system = anchored(0, 2);
  const solution = solveRelations(system);
  if (solution.status !== "determined") throw new Error("Expected anchors");
  solution.placements[1].position = 4 / 64;
  const claim = derivePositions(solution.placements, [midpoint]);
  expect(checkDerivedPositions(system, solution, [midpoint], claim)).toBe(
    false,
  );
  solution.placements[1].position = 2 / 64;
  solution.placements[0].chain = [];
  expect(checkDerivedPositions(system, solution, [midpoint], claim)).toBe(
    false,
  );
});

it("derives from checked feasible free boxes, but never from contradictions", () => {
  const system = anchored(0, 2);
  system.anchors.pop();
  const solution = solveRelations(system);
  if (solution.status !== "underdetermined")
    throw new Error("Expected free box");
  const claim = derivePositions(solution.placements, [midpoint]);
  expect(checkDerivedPositions(system, solution, [midpoint], claim)).toBe(true);
  system.anchors.push({ id: "conflict", variable: "a", position: 1 });
  expect(checkDerivedPositions(system, solveRelations(system), [], [])).toBe(
    false,
  );
});

it("supports empty requests and coincident endpoints", () => {
  const system = anchored(-3, -3);
  expect(derivePositions(endpoints(-3, -3), [])).toEqual([]);
  expect(checkDerivedPositions(system, solveRelations(system), [], [])).toBe(
    true,
  );
  expect(
    derivePositions(endpoints(-3, -3), [{ ...midpoint, to: "a" }]),
  ).toEqual([{ variable: "middle", position: -3 / 64 }]);
});
