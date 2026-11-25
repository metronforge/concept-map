import assert from "node:assert/strict";
import { test } from "node:test";
import { overlapAudit } from "./overlap.mjs";

const audit = (...paths) =>
  overlapAudit(paths.map((path, i) => ({ id: `e${i}`, path })));

test("measure partial overlap once despite reversed and split segments", () => {
  const result = audit("M0 0 H10 H20", "M15 0 H5");
  assert.equal(result.sharedLength, 10);
  assert.deepEqual(result.pairs, [
    {
      edges: ["e0", "e1"],
      length: 10,
      spans: [{ axis: "x", coordinate: 0, start: 5, end: 15 }],
    },
  ]);
});

test("separate retraced length from shared length without double counting", () => {
  const result = audit("M0 0 H20 H5 H15", "M8 0 H12");
  assert.equal(result.sharedLength, 4);
  assert.equal(result.retracedLength, 15);
  assert.deepEqual(result.retraced, [
    {
      edges: ["e0", "e0"],
      length: 15,
      spans: [{ axis: "x", coordinate: 0, start: 5, end: 20 }],
    },
  ]);
});

test("count three coincident edges as three pairs, including vertical runs", () => {
  const result = audit("M1 0 V10", "M1 10 V0", "M1 2 V8");
  assert.equal(result.pairs.length, 3);
  assert.equal(result.sharedLength, 22);
  assert.equal(result.retracedLength, 0);
});

test("exclude point contacts, crossings, near misses and moveto gaps", () => {
  const result = audit(
    "M0 0 H4 M6 0 H10",
    "M4 0 H6",
    "M0 0.000000001 H10",
    "M5 -1 V1",
  );
  assert.deepEqual(result.pairs, []);
  assert.equal(result.sharedLength, 0);
});

test("disclose diagonal coverage instead of treating diagonals as clear", () => {
  const result = audit("M0 0 L3 4 H8", "M3 4 H6");
  assert.equal(result.ignoredDiagonalSegments, 1);
  assert.equal(result.ignoredDiagonalLength, 5);
  assert.equal(result.sharedLength, 3);
});

test("keep shared runs on different lines separate", () => {
  const result = audit("M0 0 H10 V10 H0", "M2 0 H8 M2 10 H8");
  assert.equal(result.sharedLength, 12);
  assert.deepEqual(result.pairs[0].spans, [
    { axis: "x", coordinate: 0, start: 2, end: 8 },
    { axis: "x", coordinate: 10, start: 2, end: 8 },
  ]);
});

test("empty input has no overlaps and audit leaves paths unchanged", () => {
  assert.equal(overlapAudit([]).sharedLength, 0);
  const paths = [{ id: "a", path: "M0 0 H10" }];
  const before = structuredClone(paths);
  overlapAudit(paths);
  assert.deepEqual(paths, before);
});
