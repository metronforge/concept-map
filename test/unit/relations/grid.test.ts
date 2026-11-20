import { expect, it } from "vitest";
import fc from "fast-check";
import { normalizeRelations } from "../../../src/layout/relations/normalize.js";

it("rounds random positive and negative gaps up by less than one grid cell", () => {
  fc.assert(
    fc.property(fc.integer({ min: -1000000, max: 1000000 }), (n) => {
      const gap = n / 1024;
      const graph = normalizeRelations({
        variables: [
          { id: "a", size: 0 },
          { id: "b", size: 1 },
        ],
        anchors: [{ id: "origin", variable: "a", position: 0 }],
        relations: [{ id: "gap", from: "a", to: "b", kind: "minimum", gap }],
      });
      const weight = graph.edges[2].weight;
      expect(Number.isSafeInteger(weight)).toBe(true);
      expect(weight / 64).toBeGreaterThanOrEqual(gap);
      expect(weight / 64 - gap).toBeLessThan(1 / 64);
    }),
    { numRuns: 1000, seed: 69 },
  );
});

it("preserves equality as exact opposite bounds for random sizes and gaps", () => {
  fc.assert(
    fc.property(
      fc.integer({ min: 0, max: 1000000 }),
      fc.integer({ min: -1000000, max: 1000000 }),
      (size, gap) => {
        const graph = normalizeRelations({
          variables: [{ id: "a", size: size / 1024 }],
          anchors: [{ id: "origin", variable: "a", position: 0 }],
          relations: [
            {
              id: "self",
              from: "a",
              to: "a",
              kind: "equal",
              gap: gap / 1024,
              size: "a",
            },
          ],
        });
        const forward = graph.edges[2].weight;
        expect(forward + graph.edges[3].weight).toBe(0);
        expect(forward / 64).toBeGreaterThanOrEqual((size + gap) / 1024);
        expect(forward / 64 - (size + gap) / 1024).toBeLessThan(2 / 64);
      },
    ),
    { numRuns: 1000, seed: 70 },
  );
});
