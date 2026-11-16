import { expect, test } from "vitest";
import * as api from "../../../src/layout/index";

test("error guards accept copies by name and kind, not their prototype", () => {
  const pairs = [
    ["EngineFailedError", "engine-failed", api.isEngineFailedError],
    ["ResultRejectedError", "result-rejected", api.isResultRejectedError],
    [
      "UnsupportedConstraintsError",
      "unsupported-constraints",
      api.isUnsupportedConstraintsError,
    ],
    ["LayoutDefectsError", "layout-defects", api.isLayoutDefectsError],
  ] as const;
  for (const [name, kind, guard] of pairs) {
    expect(guard({ name, kind })).toBe(true);
    expect(guard({ name, kind: "wrong" })).toBe(false);
    expect(guard({ name: "wrong", kind })).toBe(false);
    expect(guard(null)).toBe(false);
    expect(api.isLayoutError({ name, kind })).toBe(true);
  }
});

test("public error classes carry pipeline data", () => {
  const cause = new Error("crash");
  const error = new api.EngineFailedError({
    placer: "fake",
    cause,
    message: "fake failed",
  });
  expect(error).toBeInstanceOf(api.LayoutError);
  expect(error).toMatchObject({
    name: "EngineFailedError",
    kind: "engine-failed",
    placer: "fake",
    cause,
  });
  expect(error.data).toEqual({ placer: "fake", cause, message: "fake failed" });
});

test("hand geometry stays intact while strict reports broken required lanes", async () => {
  const { sourceFixture } = await import("./fixture");
  const { dagreEngine } = await import("../../../src/layout/dagre");
  const hand = await api.layout(sourceFixture(), dagreEngine);
  hand.lanes.client.x = hand.viewBox[0] + 100;
  const report = api.check(hand, hand);
  expect(report.constraints[0].holds).toBe(false);
  expect(await api.layout(hand, dagreEngine)).toEqual(hand);
  const error = await api
    .layout(hand, dagreEngine, { strict: true })
    .catch((e: unknown) => e);
  expect(api.isLayoutDefectsError(error)).toBe(true);
  if (api.isLayoutDefectsError(error)) {
    expect(error.report).toEqual(report);
    expect(error.message).toMatch(/outside lane/);
  }
});

test("unsupported required constraints become their own boundary exception", async () => {
  const { sourceFixture } = await import("./fixture");
  const engine = {
    name: "unsupported",
    capabilities: {},
    place: async () => {
      throw new Error("must not run");
    },
    layout: async () => {
      throw new Error("must not run");
    },
  };
  const error = await api
    .layout(sourceFixture(), engine)
    .catch((e: unknown) => e);
  expect(api.isUnsupportedConstraintsError(error)).toBe(true);
  expect(error).toMatchObject({
    placer: "unsupported",
    constraints: [expect.objectContaining({ kind: "lanes" })],
  });
  expect(api.isEngineFailedError(error)).toBe(false);
});
