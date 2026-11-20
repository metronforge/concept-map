import assert from "node:assert/strict";
import { test } from "node:test";
import { inputs } from "./inputs.mjs";
import { prepare } from "./prepare.mjs";
import { polylines } from "../../dist/layout/stages/paths.js";

const cases = inputs();

test("all 260 connections keep exact ports, boxes and frame identity", async () => {
  let edges = 0,
    gaps = 0,
    corners = 0,
    loops = 0,
    frameEnds = 0;
  for (const item of await cases) {
    const before = JSON.stringify(item);
    const problem = prepare(item);
    assert.equal(problem.edges.length, Object.keys(item.resolved.edges).length);
    for (const kind of ["nodes", "frames"])
      for (const shape of problem[kind])
        assert.deepEqual(shape.box, item.resolved[kind][shape.id].box);
    for (const edge of problem.edges) {
      const original = item.resolved.edges[edge.id];
      const points = polylines(original.path, true)[0];
      assert.deepEqual(edge.from.point, points[0]);
      assert.deepEqual(edge.to.point, points.at(-1));
      assert.equal(edge.from.id, original.from);
      assert.equal(edge.to.id, original.to);
      edges++;
      loops += Number(edge.from.id === edge.to.id);
      for (const end of [edge.from, edge.to]) {
        assert.ok(end.gap === 0 || end.gap === 2);
        gaps += Number(end.gap === 2);
        corners += Number(end.sides.length === 2);
        frameEnds += Number(end.kind === "frame");
      }
    }
    assert.equal(JSON.stringify(item), before);
  }
  assert.deepEqual(
    { edges, gaps, corners, loops, frameEnds },
    { edges: 260, gaps: 133, corners: 2, loops: 2, frameEnds: 1 },
  );
});

test("old route interiors and annotation positions do not reach either router", async () => {
  for (const item of await cases) {
    const changed = structuredClone(item);
    for (const edge of Object.values(changed.resolved.edges)) {
      const points = polylines(edge.path, true)[0];
      edge.path = `M${points[0]} L-999 -999 L${points.at(-1)}`;
      edge.badge = [1000, 2000];
      if (edge.label) edge.label.at = [3000, 4000];
    }
    assert.deepEqual(prepare(changed), prepare(item));
    const problem = prepare(item);
    assert.deepEqual(Object.keys(problem), ["id", "nodes", "frames", "edges"]);
    for (const edge of problem.edges)
      assert.deepEqual(Object.keys(edge), ["id", "from", "to"]);
  }
});

function fixture(path = "M10 5 H20") {
  return {
    id: "fixture",
    resolved: {
      nodes: { a: { box: [0, 0, 10, 10] }, b: { box: [20, 0, 10, 10] } },
      frames: {},
      edges: { ab: { from: "a", to: "b", path } },
    },
  };
}

test("ports retain gaps, corner choices and curved route endpoints", () => {
  const edge = prepare(fixture("M10 10 C10 20 18 20 18 5")).edges[0];
  assert.deepEqual(edge.from, {
    id: "a",
    kind: "node",
    point: [10, 10],
    sides: ["right", "bottom"],
    gap: 0,
  });
  assert.deepEqual(edge.to, {
    id: "b",
    kind: "node",
    point: [18, 5],
    sides: ["left"],
    gap: 2,
  });
});

test("reject disconnected, missing, ambiguous and interior endpoints explicitly", () => {
  assert.throws(
    () => prepare(fixture("M10 5 H15 M18 5 H20")),
    /connected route/,
  );
  assert.throws(() => prepare(fixture("M5 5 H20")), /inside or not aligned/);
  assert.throws(
    () => prepare(fixture("M11 11 L20 5")),
    /inside or not aligned/,
  );
  const missing = fixture();
  delete missing.resolved.nodes.b;
  assert.throws(() => prepare(missing), /endpoint: b/);
  const ambiguous = fixture();
  ambiguous.resolved.frames.a = { box: [0, 0, 10, 10] };
  assert.throws(() => prepare(ambiguous), /endpoint: a/);
});

test("prepared boxes and ports share no mutable arrays with the reference map", async () => {
  const item = (await cases).find((c) => c.id === "book/hand/2-1");
  const before = structuredClone(item);
  const problem = prepare(item);
  assert.equal(
    problem.edges.find((e) => e.id === "timeout_outer").to.kind,
    "frame",
  );
  problem.nodes[0].box[0] = -999;
  problem.frames[0].box[0] = -999;
  problem.edges[0].from.point[0] = -999;
  assert.deepEqual(item, before);
});
