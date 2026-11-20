import { expect, it } from "vitest";
import { normalizeRelations } from "../../../src/layout/relations/normalize.js";
import type { RelationSystem } from "../../../src/layout/relations/types.js";

function input(): RelationSystem {
  return {
    variables: [{ id: "a", size: 10 }],
    anchors: [{ id: "origin", variable: "a", position: 0 }],
    relations: [{ id: "same", from: "a", to: "a", kind: "equal", gap: 0 }],
  };
}

it.each([
  [
    "duplicate variable",
    (s: RelationSystem) => s.variables.push(s.variables[0]),
  ],
  [
    "duplicate relation",
    (s: RelationSystem) => s.relations.push(s.relations[0]),
  ],
  ["duplicate anchor", (s: RelationSystem) => s.anchors.push(s.anchors[0])],
  [
    "unknown source",
    (s: RelationSystem) => {
      s.relations[0].from = "missing";
    },
  ],
  [
    "unknown target",
    (s: RelationSystem) => {
      s.relations[0].to = "missing";
    },
  ],
  [
    "unknown size",
    (s: RelationSystem) => {
      s.relations[0].size = "missing";
    },
  ],
  [
    "unknown anchor",
    (s: RelationSystem) => {
      s.anchors[0].variable = "missing";
    },
  ],
  [
    "missing anchors",
    (s: RelationSystem) => {
      s.anchors = [];
    },
  ],
  [
    "negative size",
    (s: RelationSystem) => {
      s.variables[0].size = -1;
    },
  ],
  [
    "infinite size",
    (s: RelationSystem) => {
      s.variables[0].size = Infinity;
    },
  ],
  [
    "NaN gap",
    (s: RelationSystem) => {
      s.relations[0].gap = NaN;
    },
  ],
  [
    "infinite anchor",
    (s: RelationSystem) => {
      s.anchors[0].position = Infinity;
    },
  ],
  [
    "unsafe gap",
    (s: RelationSystem) => {
      s.relations[0].gap = Number.MAX_SAFE_INTEGER;
    },
  ],
  [
    "unsafe path sum",
    (s: RelationSystem) => {
      s.relations[0].gap = 2 ** 45;
    },
  ],
] as const)("rejects %s before it can become a false proof", (_, change) => {
  const system = input();
  change(system);
  expect(() => normalizeRelations(system)).toThrow();
});
