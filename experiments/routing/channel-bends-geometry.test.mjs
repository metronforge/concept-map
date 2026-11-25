import assert from "node:assert/strict";
import { test } from "node:test";
import { coupleChannels } from "./channel-coupling.mjs";

const permutations = [
  [0, 1, 2],
  [0, 2, 1],
  [1, 0, 2],
  [1, 2, 0],
  [2, 0, 1],
  [2, 1, 0],
];

// Draw both legs of each separated L and intersect the perpendicular segments.
function intersects(h, v) {
  return (
    Math.min(h[0][0], h[1][0]) <= v[0][0] &&
    v[0][0] <= Math.max(h[0][0], h[1][0]) &&
    Math.min(v[0][1], v[1][1]) <= h[0][1] &&
    h[0][1] <= Math.max(v[0][1], v[1][1])
  );
}

function crosses(horizontal, vertical, dx, dy) {
  const lines = [0, 1, 2].map((edge) => {
    const x = vertical.indexOf(edge) * 2 - 2,
      y = horizontal.indexOf(edge) * 2 - 2;
    return {
      h: [
        [dx * 20, y],
        [x, y],
      ],
      v: [
        [x, y],
        [x, dy * 20],
      ],
    };
  });
  return lines.some((a, i) =>
    lines.some((b, j) => i !== j && intersects(a.h, b.v)),
  );
}

function allows(bends, horizontal, vertical) {
  return bends.every(
    ({ horizontal: h, vertical: v, sameOrder }) =>
      horizontal.indexOf(h.segments[0]) < horizontal.indexOf(h.segments[1]) ===
      (vertical.indexOf(v.segments[0]) < vertical.indexOf(v.segments[1]) ===
        sameOrder),
  );
}

test("bend equations exactly match drawn intersections for every three-track order and quadrant", () => {
  let cases = 0;
  for (const dx of [-1, 1])
    for (const dy of [-1, 1]) {
      const routes = ["a", "b", "c"].map((id) => ({
        id,
        points: [
          [dx * 20, 0],
          [0, 0],
          [0, dy * 20],
        ],
      }));
      const result = coupleChannels(routes);
      assert.equal(result.bends.length, 3);
      for (const horizontal of permutations)
        for (const vertical of permutations) {
          assert.equal(
            allows(result.bends, horizontal, vertical),
            !crosses(horizontal, vertical, dx, dy),
          );
          cases++;
        }
      const [horizontal, vertical] = result.components[0].orders;
      assert.equal(crosses(horizontal, vertical, dx, dy), false);
    }
  assert.equal(cases, 144);
});

test("nonadjacent segments meeting at the same coordinate are not a shared bend", () => {
  const result = coupleChannels([
    {
      id: "a",
      points: [
        [-20, 0],
        [0, 0],
        [0, -20],
        [20, -20],
        [20, 0],
        [0, 0],
        [0, 20],
      ],
    },
    {
      id: "b",
      points: [
        [-20, 0],
        [0, 0],
        [0, 20],
      ],
    },
  ]);
  assert.equal(result.bends.length, 0);
});
