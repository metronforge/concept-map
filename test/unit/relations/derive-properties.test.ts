import { expect, it } from "vitest";
import fc from "fast-check";
import { derivePositions } from "../../../src/layout/relations/derive.js";
import { checkDerivedPositions } from "../../../src/layout/relations/check-derived.js";
import { solveRelations } from "../../../src/layout/relations/solve.js";
import { anchored, endpoints, midpoint } from "./derived-fixtures.js";

const limit = BigInt(Number.MAX_SAFE_INTEGER);
const ticks = fc.bigInt({ min: -limit, max: limit }).map(Number);
const parts = fc.integer({ min: 1, max: Number.MAX_SAFE_INTEGER });
const fractions = parts.chain((n) =>
  fc.tuple(fc.constant(n), fc.integer({ min: 0, max: n })),
);

it("stays within half a tick of the true rational position, with ties down", () => {
  fc.assert(
    fc.property(ticks, ticks, fractions, (a, b, [n, k]) => {
      const [value] = derivePositions(endpoints(a, b), [
        { ...midpoint, part: k, parts: n },
      ]);
      const actual = value.position * 64;
      expect(Number.isSafeInteger(actual)).toBe(true);
      const numerator =
        BigInt(a) * BigInt(n) + BigInt(k) * (BigInt(b) - BigInt(a));
      const error = 2n * (BigInt(actual) * BigInt(n) - numerator);
      expect(error >= -BigInt(n) && error < BigInt(n)).toBe(true);
    }),
    { numRuns: 1000, seed: 84 },
  );
});

it("is monotone in k for ascending and descending endpoints", () => {
  fc.assert(
    fc.property(ticks, ticks, fractions, (a, b, [n, k]) => {
      const requests = [k, Math.min(k + 1, n)].map((part, i) => ({
        ...midpoint,
        id: `p${i}`,
        part,
        parts: n,
      }));
      const [left, right] = derivePositions(endpoints(a, b), requests);
      expect(
        a <= b
          ? left.position <= right.position
          : left.position >= right.position,
      ).toBe(true);
    }),
    { numRuns: 1000, seed: 85 },
  );
});

it("preserves both endpoints even when intermediate products exceed safe numbers", () => {
  fc.assert(
    fc.property(ticks, ticks, parts, (a, b, n) => {
      const requests = [0, n].map((part, i) => ({
        ...midpoint,
        id: `p${i}`,
        part,
        parts: n,
      }));
      const claim = derivePositions(endpoints(a, b), requests);
      expect(claim.map(({ position }) => position * 64)).toEqual([a, b]);
    }),
    { numRuns: 1000, seed: 86 },
  );
});

it("accepts derived proposals and rejects mutations using source-checked endpoints", () => {
  const bound = Math.floor(Number.MAX_SAFE_INTEGER / 12);
  const anchoredTicks = fc.integer({ min: -bound, max: bound });
  fc.assert(
    fc.property(anchoredTicks, anchoredTicks, fractions, (a, b, [n, k]) => {
      const system = anchored(a, b);
      const solution = solveRelations(system);
      if (solution.status !== "determined") throw new Error("Expected anchors");
      const requests = [{ ...midpoint, part: k, parts: n }];
      const claim = derivePositions(solution.placements, requests);
      expect(checkDerivedPositions(system, solution, requests, claim)).toBe(
        true,
      );
      claim[0].position += 1 / 64;
      expect(checkDerivedPositions(system, solution, requests, claim)).toBe(
        false,
      );
    }),
    { numRuns: 1000, seed: 87 },
  );
});
