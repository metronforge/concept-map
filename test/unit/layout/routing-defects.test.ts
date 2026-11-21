import { expect, test } from "vitest";
import { ResolvedMapSchema } from "../../../src/schema.js";
import type { ResolvedMap } from "../../../src/schema.js";
import { newRoutingDefects } from "../../../src/layout/routing-defects.js";
import { check } from "../../../src/layout/stages/report.js";
import fixture from "../../fixtures/map.json";

const options = { measureLabel: () => ({ width: 20, height: 12 }) };
function clean() {
  const map = ResolvedMapSchema.parse(fixture);
  map.scenarios[0].repeatBadges = [];
  return map;
}
function defects(before: ResolvedMap, after: ResolvedMap) {
  return newRoutingDefects(before, before, after, options).map(({ a, b }) => [
    a,
    b,
  ]);
}

const cases: [string, (map: ResolvedMap) => void, string, string][] = [
  [
    "label/line",
    (m) => {
      m.edges.ab.label = { text: "Go", at: [30, 80] };
    },
    "label:ab",
    "line:ab",
  ],
  [
    "label/box",
    (m) => {
      m.edges.ab.label = { text: "Go", at: [20, 30] };
    },
    "label:ab",
    "node:a",
  ],
  [
    "step/box",
    (m) => {
      m.edges.ab.badge = [35, 25];
    },
    "node:a",
    "step:ab",
  ],
  [
    "step/label",
    (m) => {
      m.edges.ab.label = { text: "Go", at: [40, 74] };
    },
    "label:ab",
    "step:ab",
  ],
  [
    "repeat/step",
    (m) => {
      m.scenarios[0].repeatBadges = [{ edge: "ab", step: "end", at: [38, 74] }];
    },
    "step:ab",
    "repeat:0:0:end",
  ],
  [
    "line/box",
    (m) => {
      m.nodes.c.box = [20, 60, 30, 20];
    },
    "node:c",
    "line:ab",
  ],
  [
    "label/label",
    (m) => {
      m.edges.ab.label = { text: "Go", at: [80, 80] };
      m.edges.other.label = { text: "Go", at: [85, 80] };
    },
    "label:ab",
    "label:other",
  ],
];

test.each(cases)(
  "detects new %s defects using the existing hard check",
  (_, change, a, b) => {
    const before = clean();
    before.nodes.c = { label: "C", layer: "client", box: [100, 140, 30, 20] };
    before.edges.other = { from: "a", to: "b", path: "M60,25 H180 V115 H60" };
    const after = structuredClone(before);
    change(after);
    expect(defects(before, after)).toContainEqual([a, b]);
  },
);

test("does not refuse an unchanged drawing with existing defects", () => {
  const before = clean();
  before.edges.ab.label = { text: "Go", at: [30, 80] };
  expect(check(before, before, options).hard).toBeGreaterThan(0);
  expect(defects(before, structuredClone(before))).toEqual([]);
});

test("removing one defect cannot hide a new defect with the same total", () => {
  const before = clean();
  before.edges.ab.badge = [35, 25];
  const after = structuredClone(before);
  after.edges.ab.badge = [35, 115];
  expect(check(before, before, options).hard).toBe(1);
  expect(check(before, after, options).hard).toBe(1);
  expect(defects(before, after)).toEqual([["node:b", "step:ab"]]);
});

test("supplied font metrics are used independently of recorded measurements", () => {
  const before = clean();
  const after = structuredClone(before);
  after.edges.ab.label = { text: "Go", at: [30, 80] };
  after.measurement = {
    name: "untrusted",
    labels: { ab: { width: 0, height: 0 } },
  };
  expect(defects(before, after)).toContainEqual(["label:ab", "line:ab"]);
  expect(
    newRoutingDefects(before, before, after, {
      measureLabel: () => ({ width: 1, height: 1 }),
    }),
  ).toEqual([]);
});

test("a new tight contact is not a hard defect", () => {
  const before = clean();
  before.edges.ab.badge = [100, 70];
  const after = structuredClone(before);
  after.edges.ab.label = { text: "Go", at: [37, 80] };
  expect(check(before, after, options).labels.lines[0].band).toBe("tight");
  expect(defects(before, after)).toEqual([]);
});

test("one repeat badge leaving a box cannot hide another badge arriving", () => {
  const before = clean();
  before.edges.other = { from: "a", to: "b", path: "M60,25 H180 V115 H60" };
  before.scenarios[0].repeatBadges = [
    { edge: "ab", step: "end", at: [35, 25] },
    { edge: "other", step: "end", at: [100, 160] },
  ];
  const after = structuredClone(before);
  after.scenarios[0].repeatBadges![0].at = [100, 160];
  after.scenarios[0].repeatBadges![1].at = [35, 25];
  expect(check(before, before, options).hard).toBe(1);
  expect(check(before, after, options).hard).toBe(1);
  expect(defects(before, after)).toEqual([["node:a", "repeat:0:1:end"]]);
});
