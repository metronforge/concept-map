import assert from "node:assert/strict";
import { test } from "node:test";
import { shortestChannel } from "./channel-search.mjs";

function graph(upperLength) {
  const points = [
    [0, 0],
    [1, 0],
    [1, 1],
    [2, 1],
    [0, 1],
    [0, 2],
    [2, 2],
  ];
  const links = [
    [
      [1, 0, upperLength],
      [4, 1, 1],
    ],
    [[2, 1, 1]],
    [[3, 0, 1]],
    [],
    [[5, 1, 1]],
    [[6, 0, 2]],
    [[3, 3, 1]],
  ];
  return {
    points,
    start: 0,
    goal: 3,
    neighbours: (at) =>
      links[at].map(([next, direction, length]) => ({
        next,
        direction,
        length,
      })),
  };
}

const ends = {
  from: { sides: ["right", "bottom"] },
  to: { sides: ["left", "bottom"] },
};

test("choose the shorter path when the bend counts tie", () => {
  assert.deepEqual(shortestChannel(graph(10), ends), [
    [0, 0],
    [0, 2],
    [2, 2],
    [2, 1],
  ]);
  assert.deepEqual(shortestChannel(graph(1), ends), [
    [0, 0],
    [1, 0],
    [1, 1],
    [2, 1],
  ]);
});

test("prefer fewer bends even if that route is much longer", () => {
  const grid = graph(1000);
  // Remove the first turn from the long upper path; the lower still has two.
  grid.points[2] = [2, 0];
  grid.points[3] = [2, 1];
  const original = grid.neighbours;
  grid.neighbours = (at) =>
    original(at).map((link) =>
      at === 1
        ? { ...link, direction: 0 }
        : at === 2
          ? { ...link, direction: 1 }
          : link,
    );
  assert.deepEqual(
    shortestChannel(grid, { ...ends, to: { sides: ["top", "bottom"] } }),
    [
      [0, 0],
      [2, 0],
      [2, 1],
    ],
  );
});
