import { expect, test } from "vitest";
import { layout, check } from "../../../src/layout/index";
import { dagreEngine } from "../../../src/layout/dagre";
import {
  isResultRejectedError,
  isEngineFailedError,
} from "../../../src/layout/errors";
import { sourceFixture } from "./fixture";

for (const direction of ["down", "right"] as const) {
  test(`${direction}: check independently rejects nodes outside their source lane`, async () => {
    const source = { ...sourceFixture(), direction };
    const resolved = await layout(source, dagreEngine);
    resolved.nodes.a.box[0] = resolved.lanes.client.x - 1;
    delete resolved.nodes.a.lane; // A proposer cannot change the membership being checked.
    const report = check(source, resolved);
    expect(report.constraints).toEqual([
      expect.objectContaining({
        kind: "lanes",
        strength: "required",
        holds: false,
        message: expect.stringMatching(/outside lane/),
      }),
    ]);
    expect(report.hard).toBeGreaterThan(0);
  });
  test(`${direction}: check rejects overlapping or reversed source lane order`, async () => {
    const source = { ...sourceFixture(), direction };
    source.lanes.empty = { label: "Empty", layer: "client" };
    const resolved = await layout(source, dagreEngine);
    const axis = direction === "right" ? "x" : "y";
    resolved.lanes.empty[axis] = resolved.lanes.client[axis];
    expect(check(source, resolved).constraints[0]).toMatchObject({
      holds: false,
      message: expect.stringMatching(/ordered and disjoint/),
    });
  });
}

test("layout rejects a lying placer without strict, using the source membership", async () => {
  const liar = {
    name: "liar",
    capabilities: { direction: "preferred", lanes: "required" },
    layout: dagreEngine.layout,
    async place() {
      return {
        nodes: { a: [0, 0, 100, 100], b: [0, 120, 100, 100] },
        edges: {
          ab: {
            points: [
              [50, 100],
              [50, 120],
            ],
          },
        },
        lanes: { client: [200, 200, 300, 300] },
      };
    },
  };
  const error = await layout(sourceFixture(), liar).catch((e: unknown) => e);
  expect(isResultRejectedError(error)).toBe(true);
  expect(isEngineFailedError(error)).toBe(false);
  expect(error).toMatchObject({
    placer: "liar",
    constraint: "lanes",
    message: expect.stringMatching(/outside lane/s),
  });
});

test("legacy layout-only engines keep accepting lanes and direction", async () => {
  const source = { ...sourceFixture(), direction: "right" as const };
  const legacy = { layout: dagreEngine.layout };
  expect(await layout(source, legacy)).toEqual(
    await layout(source, dagreEngine),
  );
});

test("layout turns legacy engine exceptions into engine failures, not map facts", async () => {
  const cause = new Error("engine crashed");
  const error = await layout(sourceFixture(), {
    layout: async () => {
      throw cause;
    },
  }).catch((e: unknown) => e);
  expect(isEngineFailedError(error)).toBe(true);
  expect(isResultRejectedError(error)).toBe(false);
  expect(error).toMatchObject({
    cause,
    message: "legacy LayoutEngine failed: engine crashed",
  });
});

test("the checker uses source lane order and axis even if a proposer changes both", async () => {
  const source = { ...sourceFixture(), direction: "right" as const };
  source.lanes.empty = { label: "Empty", layer: "client" };
  const resolved = await layout(source, dagreEngine);
  resolved.direction = "down";
  resolved.lanes.empty.x =
    resolved.lanes.client.x! - resolved.lanes.empty.w! - 1;
  resolved.lanes = {
    empty: resolved.lanes.empty,
    client: resolved.lanes.client,
  };
  expect(check(source, resolved).constraints[0]).toMatchObject({
    holds: false,
    message: expect.stringMatching(/ordered and disjoint/),
  });
});

test("a hand drawing with a missing lane gets a hard verdict, not an exception", async () => {
  const source = sourceFixture();
  const resolved = await layout(source, dagreEngine);
  const before = check(source, resolved);
  delete resolved.lanes.client;
  const report = check(source, resolved);
  expect(report.hard).toBe(before.hard + 1);
  expect(report.constraints[0]).toMatchObject({
    holds: false,
    strength: "required",
  });
});
