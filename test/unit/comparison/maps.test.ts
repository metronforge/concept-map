import { test, expect } from "vitest";
import { readFileSync } from "node:fs";
import {
  bookMaps,
  exampleMaps,
  comparisonCopy,
  stripGeometry,
} from "../../../scripts/comparison/maps.mjs";
import {
  coffeeManual,
  coffeeSource,
} from "../../../scripts/comparison/coffee.mjs";
import { SourceMapSchema } from "../../../src/schema";
import { validateReferences } from "../../../src/layout/index";

test("standalone comparison sources include defaults before reference validation", () => {
  const examples = exampleMaps();
  expect(examples.map(({ id }) => id)).toEqual([
    "coffee",
    "door",
    "gcd",
    "side-hints",
    "free",
    "free-plain",
    "same-rank",
    "same-rank-plain",
  ]);
  for (const { id, source } of examples) {
    const name = id.endsWith("-plain") ? id.slice(0, -6) : id;
    const original = JSON.parse(
      readFileSync(`examples/${name}/map.json`, "utf8"),
    );
    expect(source.edges).toEqual(original.edges);
    expect(source.title).toBe(original.title);
    expect(source.frames).toEqual({});
    expect(() => validateReferences(source)).not.toThrow();
  }
});

test("the plain free comparison removes only the stated hint", () => {
  const examples = exampleMaps();
  const hinted = examples.find(({ id }) => id === "free")!.source;
  const plain = examples.find(({ id }) => id === "free-plain")!.source;
  const { layout, ...withoutHint } = hinted;
  expect(layout.hints).toEqual([
    { kind: "free", edge: "feedback", strength: "required" },
  ]);
  expect(plain).toEqual(withoutHint);
});

test("the plain same-rank comparison removes only the stated hint", () => {
  const examples = exampleMaps();
  const hinted = examples.find(({ id }) => id === "same-rank")!.source;
  const plain = examples.find(({ id }) => id === "same-rank-plain")!.source;
  const { layout, ...withoutHint } = hinted;
  expect(layout.hints).toEqual([
    { kind: "sameRank", nodes: ["quick", "finish"], strength: "required" },
  ]);
  expect(plain).toEqual(withoutHint);
});

test("all 23 stripped sources validate, without mutating book fixtures", () => {
  const originals = JSON.parse(
    readFileSync("test/fixtures/book-maps.json", "utf8"),
  );
  const before = JSON.stringify(originals);
  expect(bookMaps()).toHaveLength(23);
  for (const { map } of originals) {
    const source = stripGeometry(comparisonCopy(map));
    expect(SourceMapSchema.safeParse(source).success).toBe(true);
    expect(() => validateReferences(source)).not.toThrow();
    expect(source).not.toHaveProperty("viewBox");
    for (const node of Object.values(source.nodes))
      expect(node).not.toHaveProperty("box");
    for (const edge of Object.values(source.edges))
      expect(edge).not.toHaveProperty("path");
  }
  expect(JSON.stringify(originals)).toBe(before);
});
test("2-1 exception changes exactly one edge and its step reference", () => {
  const { map } = JSON.parse(
    readFileSync("test/fixtures/book-maps.json", "utf8"),
  ).find((m: { id: string }) => m.id === "2-1");
  const edited = comparisonCopy(map);
  expect(edited.frames.outer).toEqual(map.frames.outer);
  expect(edited.nodes).toEqual(map.nodes);
  expect(Object.keys(edited.edges)).toEqual(
    Object.keys(map.edges).filter((id) => id !== "timeout_outer"),
  );
  for (const [id, edge] of Object.entries(edited.edges))
    expect(edge).toEqual(map.edges[id]);
  expect(map.edges.timeout_outer.to).toBe("outer");
});
test("coffee hand geometry strips to the exact English source and both scenarios", () => {
  expect(stripGeometry(coffeeManual())).toEqual(coffeeSource);
  expect(coffeeSource.scenarios.map((s) => s.label)).toEqual([
    "Normal",
    "Out of milk",
  ]);
  expect(() => validateReferences(coffeeSource)).not.toThrow();
});
