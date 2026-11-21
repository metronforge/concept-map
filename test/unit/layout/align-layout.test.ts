import { expect, test } from "vitest";
import fc from "fast-check";
import { alignLayout } from "../../../src/layout/relations/align-layout.js";
import { laneFixture } from "./lane-rank-fixture.js";

for (const right of [false, true]) {
  test(`cross separation widens containing lanes and retains empty extents (${right})`, () => {
    const { problem, result } = laneFixture(right);
    const axis = right ? 0 : 1;
    const cross = 1 - axis;
    result.nodes.tail[cross] = 100;
    result.lanes.first[cross + 2] = 140;
    const before = structuredClone({ problem, result });
    const aligned = alignLayout(problem, result, 20, 130);
    if (aligned.status !== "determined") throw new Error(aligned.status);
    expect(aligned.nodes.a[axis]).toBe(aligned.nodes.b[axis]);
    expect(aligned.nodes.a[cross]).toBe(0);
    expect(aligned.nodes.b[cross]).toBe(150);
    expect(aligned.lanes.first[cross + 2]).toBe(190);
    expect(aligned.lanes.empty[cross]).toBe(result.lanes.empty[cross]);
    expect(aligned.lanes.empty[cross + 2]).toBe(result.lanes.empty[cross + 2]);
    expect(aligned.lanes.last[cross + 2]).toBe(result.lanes.last[cross + 2]);
    expect({ problem, result }).toEqual(before);
  });
}

const cases = fc.record({
  right: fc.boolean(),
  offset: fc.integer({ min: -100000, max: 100000 }),
  nodeGap: fc.integer({ min: 0, max: 200 }),
  cross: fc.integer({ min: -100000, max: 100000 }),
});

function verify(input: fc.ArbitraryValue<typeof cases>) {
  const { problem, result } = laneFixture(input.right);
  const rank = input.right ? 0 : 1;
  const cross = 1 - rank;
  for (const box of [
    ...Object.values(result.nodes),
    ...Object.values(result.lanes),
  ]) {
    box[rank] += input.offset / 1000;
    box[cross] += input.cross / 1000;
  }
  const before = structuredClone({ problem, result });
  const aligned = alignLayout(problem, result, 20, input.nodeGap);
  if (aligned.status !== "determined") throw new Error(aligned.status);
  expect(aligned.nodes.a[rank]).toBe(aligned.nodes.b[rank]);
  for (const node of problem.nodes) {
    const box = aligned.nodes[node.id];
    for (const axis of [0, 1])
      expect(box[axis]).toBeGreaterThanOrEqual(result.nodes[node.id][axis]);
    if (!node.lane) continue;
    const lane = aligned.lanes[node.lane];
    for (const axis of [0, 1]) {
      expect(box[axis]).toBeGreaterThanOrEqual(lane[axis]);
      expect(box[axis] + box[axis + 2]).toBeLessThanOrEqual(
        lane[axis] + lane[axis + 2],
      );
    }
  }
  const lanes = Object.values(aligned.lanes);
  for (let i = 1; i < lanes.length; i++)
    expect(lanes[i][rank]).toBeGreaterThanOrEqual(
      lanes[i - 1][rank] + lanes[i - 1][rank + 2],
    );
  expect(aligned.lanes.empty[cross + 2]).toBe(result.lanes.empty[cross + 2]);
  expect({ problem, result }).toEqual(before);
}

test("1,000 fractional placements keep lanes containing their separated nodes", () => {
  fc.assert(fc.property(cases, verify), { numRuns: 1000, seed: 78 });
});
