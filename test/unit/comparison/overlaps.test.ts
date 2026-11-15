import { test, expect } from "vitest";
import { labelOverlaps } from "../../../scripts/comparison/overlaps.mjs";
test("edge label overlaps count each pair, excluding boundary contact", () => {
  const map = {
    nodes: { n: { box: [0, 0, 10, 10] } },
    edges: {
      a: { label: { text: "A", at: [5, 10] } },
      b: { label: { text: "B", at: [10, 10] } },
      c: { label: { text: "C", at: [20, 10] } },
    },
  };
  const result = labelOverlaps(map, () => ({ width: 10, height: 12 }));
  expect(result.labelNodeOverlaps).toBe(1);
  expect(result.labelLabelOverlaps).toBe(1);
  expect(result.labelOverlapDetails.labels).toEqual([["a", "b"]]);
});
