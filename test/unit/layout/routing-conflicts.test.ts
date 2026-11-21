import { expect, test } from "vitest";
import { ResolvedMapSchema } from "../../../src/schema.js";
import { routingConflictEdges } from "../../../src/layout/inspect-routes.js";
import type { Contact } from "../../../src/layout/stages/quality.js";
import fixture from "../../fixtures/map.json";

const contact = (a: string, b: string): Contact => ({
  a,
  b,
  gap: -10,
  band: "defect",
});

function map() {
  const resolved = ResolvedMapSchema.parse(fixture);
  resolved.edges["route:second"] = { ...resolved.edges.ab };
  resolved.scenarios[0].repeatBadges = [
    { edge: "ab", step: "end:again", at: [0, 0] },
    { edge: "route:second", step: "end:again", at: [0, 0] },
  ];
  return resolved;
}

test.each(["line", "label", "step"])(
  "%s contacts retain complete arrow ids, including colons",
  (kind) => {
    expect(
      routingConflictEdges([contact("node:a", `${kind}:route:second`)], map()),
    ).toEqual(["route:second"]);
  },
);

test("repeats on the same step name their own arrows", () => {
  expect(
    routingConflictEdges(
      [contact("repeat:0:1:end:again", "repeat:0:0:end:again")],
      map(),
    ),
  ).toEqual(["route:second", "ab"]);
});

test("repeat identity includes the scenario", () => {
  const resolved = map();
  resolved.scenarios.push({
    ...resolved.scenarios[0],
    id: "second",
    repeatBadges: [{ edge: "route:second", step: "end:again", at: [0, 0] }],
  });
  expect(
    routingConflictEdges([contact("node:a", "repeat:1:0:end:again")], resolved),
  ).toEqual(["route:second"]);
});

test("conflicts name both arrows once in contact order, never node step ids", () => {
  expect(
    routingConflictEdges(
      [
        contact("label:route:second", "step:ab"),
        contact("node:a", "line:ab"),
        contact("node-step:0:end", "label:route:second"),
      ],
      map(),
    ),
  ).toEqual(["route:second", "ab"]);
  expect(routingConflictEdges([], map())).toEqual([]);
});
