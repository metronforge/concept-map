import { test, expect } from "vitest";
import { fc } from "@fast-check/vitest";
import { readFileSync } from "node:fs";
import { layout, refine, fontTableMeasurer } from "../../../src/layout/index";
import { dagreEngine } from "../../../src/layout/dagre";
import { elkEngine } from "../../../src/layout/elk";
import { SourceMapSchema } from "../../../src/schema";
import { resolvedMaps } from "../fixtures/maps";
import { bookMaps, stripGeometry } from "../../../scripts/comparison/maps.mjs";

// The comparison fixture removes only the known 2.1 arrow to a frame.
// Idempotence below still includes all original, unmodified book drawings.
const sources = [
  ...bookMaps().map(({ manual }) => stripGeometry(manual)),
  ...["coffee", "door", "gcd"].map((name) =>
    SourceMapSchema.parse(
      JSON.parse(readFileSync(`examples/${name}/map.json`, "utf8")),
    ),
  ),
];
const layouts = await Promise.all(
  [dagreEngine, elkEngine].flatMap((engine) =>
    sources.map(async (source) => ({
      id: `${engine.name} ${source.id}`,
      map: await layout(source, engine),
    })),
  ),
);
const maps = [...resolvedMaps(), ...layouts];

test.each(maps)(
  "refining $id twice with the same measurer is idempotent",
  ({ map }) => {
    fc.assert(
      fc.property(fc.double({ min: 0.75, max: 1.5, noNaN: true }), (scale) => {
        const measurer = {
          name: "scaled",
          measure: (text, style) => {
            const m = fontTableMeasurer.measure(text, style);
            return {
              width: m.width * scale,
              height: m.height * scale,
              padding: scale / 10,
            };
          },
        };
        const once = refine(map, measurer);
        expect(refine(once, measurer)).toEqual(once);
      }),
      { numRuns: 20 },
    );
  },
);

test.each(layouts)(
  "refining font-table layout $id with the table changes nothing",
  ({ map }) => {
    expect(refine(map, fontTableMeasurer)).toEqual(map);
  },
);
