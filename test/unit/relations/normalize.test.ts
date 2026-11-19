import { expect, it } from "vitest";
import { normalizeRelations } from "../../../src/layout/relations/normalize.js";
import type { RelationSystem } from "../../../src/layout/relations/types.js";

const system: RelationSystem = {
  variables: [
    { id: "a", size: 10.001 },
    { id: "b", size: 20 },
  ],
  anchors: [{ id: "start", variable: "a", position: -2 }],
  relations: [
    { id: "after", from: "a", to: "b", kind: "minimum", gap: 0.001, size: "a" },
    { id: "align", from: "b", to: "a", kind: "equal", gap: -10.03125 },
  ],
};

it("rounds size and gap separately before adding them", () => {
  const graph = normalizeRelations(system);
  expect(graph.variables).toEqual(["a", "b"]);
  expect(graph.sizes).toEqual([641, 1280]);
  expect(graph.edges[2]).toEqual({
    from: 1,
    to: 2,
    weight: 642,
    source: { kind: "relation", id: "after", reverse: false },
  });
});

it("represents a fixed anchor with both bounds against vertex zero", () => {
  expect(normalizeRelations(system).edges.slice(0, 2)).toEqual([
    {
      from: 0,
      to: 1,
      weight: -128,
      source: { kind: "anchor", id: "start", reverse: false },
    },
    {
      from: 1,
      to: 0,
      weight: 128,
      source: { kind: "anchor", id: "start", reverse: true },
    },
  ]);
});

it("negates the rounded equality distance, rather than rounding twice", () => {
  const graph = normalizeRelations({
    ...system,
    relations: [{ id: "exact", from: "a", to: "b", kind: "equal", gap: 0.001 }],
  });
  expect(graph.edges.slice(2)).toEqual([
    {
      from: 1,
      to: 2,
      weight: 1,
      source: { kind: "relation", id: "exact", reverse: false },
    },
    {
      from: 2,
      to: 1,
      weight: -1,
      source: { kind: "relation", id: "exact", reverse: true },
    },
  ]);
});

it("preserves relation order and keeps equality edges together", () => {
  const graph = normalizeRelations(system);
  expect(graph.edges.map((edge) => edge.source.id)).toEqual([
    "start",
    "start",
    "after",
    "align",
    "align",
  ]);
  expect(graph.edges.slice(3).map((edge) => edge.weight)).toEqual([-642, 642]);
});

it("keeps input data unchanged and handles arbitrary string ids", () => {
  const input = structuredClone(system);
  input.variables[0].id = "__proto__";
  input.anchors[0].variable = "__proto__";
  input.relations = [];
  const before = structuredClone(input);
  expect(normalizeRelations(input).variables[0]).toBe("__proto__");
  expect(input).toEqual(before);
});

it("retains multiple anchors, even when their bounds contradict", () => {
  const graph = normalizeRelations({
    ...system,
    anchors: [...system.anchors, { id: "other", variable: "a", position: 3 }],
  });
  expect(graph.edges.slice(0, 4).map((edge) => edge.weight)).toEqual([
    -128, 128, 192, -192,
  ]);
});

it("allows a relation and anchor to share an id without losing provenance", () => {
  const graph = normalizeRelations({
    ...system,
    anchors: [{ id: "after", variable: "a", position: 0 }],
  });
  expect(graph.edges.slice(0, 3).map((edge) => edge.source.kind)).toEqual([
    "anchor",
    "anchor",
    "relation",
  ]);
});

it("rejects off-grid anchors rather than merging different fixed positions", () => {
  expect(() =>
    normalizeRelations({
      ...system,
      anchors: [
        { id: "first", variable: "a", position: 0.001 },
        { id: "second", variable: "a", position: 0.002 },
      ],
    }),
  ).toThrow(/anchor.*grid/i);
});

it("keeps exact fractional anchor positions unchanged", () => {
  const graph = normalizeRelations({
    ...system,
    anchors: [{ id: "fraction", variable: "b", position: -1 / 64 }],
  });
  expect(graph.edges.slice(0, 2).map(({ weight }) => weight)).toEqual([-1, 1]);
});
