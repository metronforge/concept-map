import { expect, test } from "vitest";
import fc from "fast-check";
import { alignLaneRanks } from "../../../src/layout/relations/align-lanes.js";
import { laneRankRelations } from "../../../src/layout/relations/lane-rank.js";
import { checkRelations } from "../../../src/layout/relations/check.js";
import { laneFixture } from "./lane-rank-fixture.js";

const cases = fc.record({
  right: fc.boolean(),
  offset: fc.integer({ min: -100000, max: 100000 }),
  scale: fc.integer({ min: 1, max: 10 }),
  mode: fc.constantFrom("aligned", "growth", "conflict"),
});

function generated(input: fc.ArbitraryValue<typeof cases>) {
  const { problem, result } = laneFixture(input.right);
  const axis = input.right ? 0 : 1;
  if (input.mode === "aligned") {
    result.nodes.b[axis] = 10;
    // Leave real slack in the arrow gap so floating multiplication cannot
    // make the input itself fall just short of the required rank gap.
    result.nodes.tail[axis] = 55;
  }
  if (input.mode === "conflict")
    problem.constraints.push({
      kind: "sameRank",
      nodes: ["a", "observer"],
      strength: "required",
      path: "layout.hints[1]",
    });
  for (const box of [
    ...Object.values(result.nodes),
    ...Object.values(result.lanes),
  ]) {
    box[axis] = box[axis] * input.scale + input.offset / 1000;
    box[axis + 2] *= input.scale;
  }
  return { problem, result, axis } as const;
}

function verifyLaneOrder(lanes: number[][], axis: 0 | 1) {
  for (let i = 1; i < lanes.length; i++)
    expect(lanes[i][axis]).toBeGreaterThanOrEqual(
      lanes[i - 1][axis] + lanes[i - 1][axis + 2],
    );
}

function verify(input: fc.ArbitraryValue<typeof cases>) {
  const { problem, result, axis } = generated(input);
  const before = structuredClone({ problem, result });
  const aligned = alignLaneRanks(problem, result, 20 * input.scale);
  expect(aligned.status).toBe(
    input.mode === "conflict" ? "contradictory" : "determined",
  );
  if (aligned.status === "contradictory") {
    expect(
      checkRelations(
        laneRankRelations(problem, result, 20 * input.scale),
        aligned,
      ),
    ).toBe(true);
  } else {
    expect(aligned.nodes.a[axis]).toBe(aligned.nodes.b[axis]);
    if (input.mode === "aligned")
      expect(aligned).toEqual({
        status: "determined",
        nodes: result.nodes,
        lanes: result.lanes,
      });
    for (const n of problem.nodes) {
      const box = aligned.nodes[n.id];
      expect(box[axis]).toBeGreaterThanOrEqual(result.nodes[n.id][axis]);
      expect(box.slice(2)).toEqual(result.nodes[n.id].slice(2));
      if (!n.lane) continue;
      const lane = aligned.lanes[n.lane];
      expect(box[axis]).toBeGreaterThanOrEqual(lane[axis]);
      expect(box[axis] + box[axis + 2]).toBeLessThanOrEqual(
        lane[axis] + lane[axis + 2],
      );
    }
    verifyLaneOrder(Object.values(aligned.lanes), axis);
  }
  expect({ problem, result }).toEqual(before);
}

test("1,000 fractional lane applications preserve containment, order and unforced coordinates", () => {
  fc.assert(fc.property(cases, verify), { numRuns: 1000, seed: 78 });
});
