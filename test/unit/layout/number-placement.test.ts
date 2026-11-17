import { expect, test } from "vitest";
import { readFileSync } from "node:fs";
import {
  layout,
  refine,
  check,
  fontTableMeasurer,
} from "../../../src/layout/index";
import { dagreEngine } from "../../../src/layout/dagre";
import { elkEngine } from "../../../src/layout/elk";
import { resolvedMaps } from "../fixtures/maps";

for (const [name, engine] of [
  ["dagre", dagreEngine],
  ["elk", elkEngine],
] as const)
  test(`${name}: shared placement separates repeated numbers and agrees with same-font refinement`, async () => {
    for (const example of ["coffee", "door", "gcd"]) {
      const source = JSON.parse(
        readFileSync(`examples/${example}/map.json`, "utf8"),
      );
      const map = await layout(source, engine);
      expect(refine(map, fontTableMeasurer)).toEqual(map);
      expect(
        check(map, map).steps.steps.filter((c) => c.band === "defect"),
      ).toEqual([]);
    }
  });

test("refining hand drawings never increases their hard-defect counts", () => {
  for (const { map } of resolvedMaps()) {
    const refined = refine(map, fontTableMeasurer);
    expect(check(map, refined).hard).toBeLessThanOrEqual(check(map, map).hard);
    expect(refine(refined, fontTableMeasurer)).toEqual(refined);
  }
});
