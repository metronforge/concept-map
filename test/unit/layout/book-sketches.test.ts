import { expect, test } from "vitest";
import { SourceMapSchema } from "../../../src/schema.js";
import {
  bookMaps,
  sketchSource,
  stripGeometry,
} from "../../../scripts/comparison/maps.mjs";

test("all book drawings become source sketches at their hand box centres", () => {
  const maps = bookMaps();
  expect(maps).toHaveLength(23);
  for (const { manual } of maps) {
    const source = sketchSource(manual);
    expect(SourceMapSchema.parse(source)).toEqual(source);
    expect(source.layout?.hints).toEqual(
      Object.entries(manual.nodes).map(([node, { box }]) => ({
        kind: "pin",
        node,
        at: [box[0] + box[2] / 2, box[1] + box[3] / 2],
        strength: "preferred",
      })),
    );
    const plain = stripGeometry(manual);
    expect({ ...source, layout: undefined }).toEqual({
      ...plain,
      layout: undefined,
    });
    expect(sketchSource(manual, "required").layout?.hints).toEqual(
      source.layout?.hints.map((hint) => ({ ...hint, strength: "required" })),
    );
  }
});
