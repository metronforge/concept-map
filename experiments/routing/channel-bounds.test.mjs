import assert from "node:assert/strict";
import { test } from "node:test";
import { inputs, sameRankInputs } from "./inputs.mjs";
import { prepare } from "./prepare.mjs";
import { routeChannel } from "./channel.mjs";
import { routeIssues } from "./route-audit.mjs";

test("channel routes stay in the fixed viewport with exact ports and clear boxes", async () => {
  for (const item of [...(await inputs()), ...(await sameRankInputs())]) {
    const problem = prepare(item);
    const before = structuredClone(problem);
    const routes = routeChannel(problem);
    for (const [i, route] of routes.entries()) {
      assert.deepEqual(routeIssues(problem, problem.edges[i], route), []);
      for (const [x, y] of route.points)
        assert.ok(
          x >= 0 &&
            y >= 0 &&
            x <= item.resolved.viewBox[0] &&
            y <= item.resolved.viewBox[1],
          `${item.id}/${route.id}: ${x},${y} is outside the viewport`,
        );
    }
    assert.deepEqual(problem, before);
  }
});

test("a wall across the viewport causes failure instead of an exterior detour", () => {
  const problem = {
    viewBox: [60, 30],
    nodes: [
      { id: "a", box: [5, 10, 10, 10] },
      { id: "b", box: [45, 10, 10, 10] },
      { id: "wall", box: [25, 0, 10, 30] },
    ],
    edges: [
      {
        id: "ab",
        from: { id: "a", kind: "node", point: [15, 15], sides: ["right"] },
        to: { id: "b", kind: "node", point: [45, 15], sides: ["left"] },
      },
    ],
  };
  const [route] = routeChannel(problem);
  assert.equal(route.points, undefined);
  assert.equal(typeof route.failure, "string");
});

test("an out-of-viewport terminal cannot alias an in-bounds grid intersection", () => {
  for (const point of [
    [-1, 5],
    [31, 5],
    [5, -1],
    [5, 31],
  ]) {
    const inside = {
      id: "inside",
      kind: "frame",
      point: [10, 10],
      sides: ["right", "bottom", "left", "top"],
    };
    const outside = { ...inside, id: "outside", point };
    for (const [from, to] of [
      [inside, outside],
      [outside, inside],
    ]) {
      const [route] = routeChannel({
        viewBox: [30, 30],
        nodes: [],
        edges: [{ id: "edge", from, to }],
      });
      assert.equal(route.points, undefined);
      assert.equal(typeof route.failure, "string");
    }
  }
});
