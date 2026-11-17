import { expect, test } from "vitest";
import { readFileSync } from "node:fs";
import { SourceMapSchema } from "../../../src/schema";
import { check, layout } from "../../../src/layout/index";
import { checkLabels } from "../../../src/layout/stages/label-check";
import { dagreEngine } from "../../../src/layout/dagre";
import { elkEngine } from "../../../src/layout/elk";
import { resolvedMaps } from "../fixtures/maps";

test.each(resolvedMaps())(
  "label check of book map $id equals the label part of check",
  ({ map }) => {
    const full = check(map, map);
    expect(checkLabels(map, map)).toEqual({
      labels: full.labels,
      steps: full.steps,
    });
  },
);

test.each(["coffee", "door", "gcd"])(
  "label check of %s equals the label part of check on both engines",
  async (name) => {
    const source = SourceMapSchema.parse(
      JSON.parse(readFileSync(`examples/${name}/map.json`, "utf8")),
    );
    for (const engine of [dagreEngine, elkEngine]) {
      const resolved = await layout(source, engine);
      const full = check(source, resolved);
      expect(checkLabels(source, resolved)).toEqual({
        labels: full.labels,
        steps: full.steps,
      });
    }
  },
);
