import { expect, test } from "vitest";
import { ResolvedMapSchema } from "../../../src/schema";
import { refine } from "../../../src/layout/index";
import fixture from "../../fixtures/map.json";

const ink = {
  name: "ink",
  measure: () => ({ width: 20, height: 12, left: -2, ascent: 9 }),
};
const larger = {
  name: "larger",
  measure: () => ({ width: 40, height: 24, left: -4, ascent: 18 }),
};

test.each([false, true])(
  "keeps authored anchors without measurements (JSON round trip: %s)",
  (serialized) => {
    const original = ResolvedMapSchema.parse(fixture);
    original.edges.ab.label = { text: "go", at: [70, 74] };
    const map = serialized ? JSON.parse(JSON.stringify(original)) : original;
    const result = refine(map, ink);
    expect(result.edges.ab.label!.at).toEqual([70, 74]);
    expect(result.measurement).toEqual({
      name: "ink",
      labels: { ab: ink.measure() },
    });
    expect(refine(JSON.parse(JSON.stringify(result)), ink)).toEqual(result);
    const next = refine(JSON.parse(JSON.stringify(result)), larger);
    expect(next.edges.ab.label!.at).toEqual([62, 77]);
    expect(original.measurement).toBeUndefined();
    expect(original.edges.ab.label.at).toEqual([70, 74]);
  },
);
