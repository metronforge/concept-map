import { expect, it } from "vitest";
import { explainRelations } from "../../../src/layout/relations/explain.js";
import { checkRelations } from "../../../src/layout/relations/check.js";
import type {
  DifferenceRelation,
  RelationSystem,
} from "../../../src/layout/relations/types.js";

function relation(
  id: string,
  from: string,
  to: string,
  gap: number,
  kind: DifferenceRelation["kind"] = "minimum",
): DifferenceRelation {
  return { id, from, to, gap, kind };
}

function system(relations: DifferenceRelation[]): RelationSystem {
  return {
    variables: ["a", "b", "c"].map((id) => ({ id, size: 0 })),
    anchors: [{ id: "origin", variable: "a", position: 0 }],
    relations,
  };
}

it("judges transitive bounds in order and closes on the first contradiction", () => {
  const input = system([
    relation("ab", "a", "b", 2),
    relation("bc", "b", "c", 3),
    relation("ac", "a", "c", 5),
    relation("ca", "c", "a", -4),
    relation("later", "b", "b", 1),
  ]);
  const report = explainRelations(input);
  expect(report.verdicts).toEqual([
    { id: "ab", status: "adds-information" },
    { id: "bc", status: "adds-information" },
    { id: "ac", status: "redundant" },
    { id: "ca", status: "contradicts" },
  ]);
  expect(report.solution.status).toBe("contradictory");
  expect(
    checkRelations(
      { ...input, relations: input.relations.slice(0, 4) },
      report.solution,
    ),
  ).toBe(true);
  if (report.solution.status !== "contradictory")
    throw new Error("Expected cycle");
  expect(report.solution.cycle.some((edge) => edge.id === "later")).toBe(false);
});

it("recognizes new bounds even when the compact coordinates stay the same", () => {
  const report = explainRelations(
    system([
      relation("ab", "a", "b", 2),
      relation("ac", "a", "c", 3),
      relation("bc", "b", "c", 1),
    ]),
  );
  expect(report.verdicts.map((v) => v.status)).toEqual(
    Array(3).fill("adds-information"),
  );
  expect(report.solution.status).toBe("determined");
});

it("judges both sides of an equality as one relation", () => {
  const report = explainRelations(
    system([
      relation("lower", "a", "b", 2),
      relation("exact", "a", "b", 2, "equal"),
      relation("reverse", "b", "a", -2, "equal"),
      relation("bad", "a", "b", 3, "equal"),
    ]),
  );
  expect(report.verdicts.map((v) => v.status)).toEqual([
    "adds-information",
    "adds-information",
    "redundant",
    "contradicts",
  ]);
});

it("checks implication through fixed anchors", () => {
  const input = system([relation("gap", "a", "b", 5, "equal")]);
  input.anchors.push({ id: "second", variable: "b", position: 5 });
  expect(explainRelations(input).verdicts).toEqual([
    { id: "gap", status: "redundant" },
  ]);
});

it("does not judge relations when the anchors already contradict", () => {
  const input = system([relation("unused", "a", "b", 1)]);
  input.anchors.push({ id: "conflict", variable: "a", position: 1 });
  const report = explainRelations(input);
  expect(report.verdicts).toEqual([]);
  expect(checkRelations({ ...input, relations: [] }, report.solution)).toBe(
    true,
  );
  expect(report.solution.status).toBe("contradictory");
});

it("detects redundancy and contradiction in unanchored components", () => {
  const report = explainRelations(
    system([
      relation("bc", "b", "c", 2, "equal"),
      relation("cb", "c", "b", -2),
      relation("bad", "c", "b", -1),
    ]),
  );
  expect(report.verdicts.map((v) => v.status)).toEqual([
    "adds-information",
    "redundant",
    "contradicts",
  ]);
});

it("treats self bounds as tautologies or contradictions", () => {
  const report = explainRelations(
    system([
      relation("zero", "b", "b", 0, "equal"),
      relation("negative", "b", "b", -1),
      relation("positive", "b", "b", 1 / 64),
    ]),
  );
  expect(report.verdicts.map((v) => v.status)).toEqual([
    "redundant",
    "redundant",
    "contradicts",
  ]);
});

it("rounds sizes and gaps separately before judging implication", () => {
  const input = system([
    relation("lower", "a", "b", 1 / 64),
    { ...relation("sized", "a", "b", 1 / 128), size: "a" },
    relation("same", "a", "b", 2 / 64),
  ]);
  input.variables[0].size = 1 / 128;
  expect(explainRelations(input).verdicts.map((v) => v.status)).toEqual([
    "adds-information",
    "adds-information",
    "redundant",
  ]);
});

it("allows the same bound to become redundant after reordering", () => {
  const input = system([
    relation("weak", "a", "b", 1),
    relation("strong", "a", "b", 2),
  ]);
  expect(explainRelations(input).verdicts.map((v) => v.status)).toEqual([
    "adds-information",
    "adds-information",
  ]);
  input.relations.reverse();
  expect(explainRelations(input).verdicts.map((v) => v.status)).toEqual([
    "adds-information",
    "redundant",
  ]);
});
