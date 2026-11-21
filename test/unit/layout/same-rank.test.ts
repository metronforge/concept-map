import { expect, test } from "vitest";
import { SourceMapSchema } from "../../../src/schema";
import {
  layout,
  check,
  describeDefects,
  refine,
  fontTableMeasurer,
} from "../../../src/layout/index";
import { buildProblem } from "../../../src/layout/build-problem";
import { place } from "../../../src/layout/place";
import { measureLabel } from "../../../src/layout/measure";
import { dagreEngine } from "../../../src/layout/dagre";
import { elkEngine } from "../../../src/layout/elk";

import { hint, source, drawing } from "./same-rank-fixture.js";

test("same-rank hints retain their order and default to preferred", () => {
  const map = source();
  expect(map.layout.hints).toEqual([{ ...hint, strength: "preferred" }]);
  expect(source("preferred").layout).toEqual(map.layout);
  expect(buildProblem(map, measureLabel, false).constraints).toContainEqual({
    ...hint,
    strength: "preferred",
    origin: "stated",
    path: "layout.hints[0]",
  });
  expect(source("required").layout.hints[0].strength).toBe("required");
  map.layout.hints.push({
    kind: "sameRank",
    nodes: ["b", "a"],
    strength: "required",
  });
  expect(buildProblem(map, measureLabel, false).constraints.slice(-2)).toEqual([
    {
      ...hint,
      strength: "preferred",
      origin: "stated",
      path: "layout.hints[0]",
    },
    {
      kind: "sameRank",
      nodes: ["b", "a"],
      strength: "required",
      origin: "stated",
      path: "layout.hints[1]",
    },
  ]);
});

test.each([
  { kind: "sameRank", nodes: [] },
  { kind: "sameRank", nodes: ["a"] },
  { kind: "sameRank", nodes: ["a", "bad id"] },
  { ...hint, strength: "optional" },
  { ...hint, strength: null },
  { ...hint, typo: true },
])("invalid hint syntax is rejected: %j", (invalid) => {
  const map = source();
  expect(
    SourceMapSchema.safeParse({ ...map, layout: { hints: [invalid] } }).success,
  ).toBe(false);
});

for (const engine of [dagreEngine, elkEngine]) {
  test(`${engine.name}: raw placement lists hints; layout honours already aligned groups`, async () => {
    const map = source();
    const plain = { ...map };
    delete plain.layout;
    const outcome = await place(buildProblem(map, measureLabel), engine);
    expect(outcome).toMatchObject({
      kind: "placed",
      unsupported: [
        expect.objectContaining({
          ...hint,
          path: "layout.hints[0]",
          origin: "stated",
        }),
      ],
    });
    const resolved = await layout(map, engine, { strict: true });
    expect(resolved).toEqual({
      ...(await layout(plain, engine)),
      layout: map.layout,
    });
    expect(check(map, resolved).constraints).toHaveLength(1);
  });
  test(`${engine.name}: layout honours required same-rank hints`, async () => {
    const map = source("required");
    const resolved = await layout(map, engine, { intent: false });
    expect(check(map, resolved).constraints[0].holds).toBe(true);
  });
}

test("unknown or repeated hint nodes fail before placement", async () => {
  for (const nodes of [
    ["a", "missing"],
    ["a", "a"],
  ]) {
    const map = source();
    map.layout.hints[0].nodes = nodes;
    let called = false;
    await expect(
      layout(map, {
        layout: async () => {
          called = true;
          throw new Error("must not be called");
        },
      }),
    ).rejects.toThrow(/layout\.hints\[0\].*nodes.*(missing|duplicate)/s);
    expect(called).toBe(false);
  }
});

for (const direction of ["down", "right"] as const) {
  test(`${direction}: check judges source hints by box coordinates, not metadata or sizes`, () => {
    const map = source("required", direction);
    const resolved = drawing(direction);
    delete resolved.layout;
    resolved.direction = direction === "down" ? "right" : "down";
    expect(check(map, resolved).constraints[0]).toMatchObject({
      kind: "sameRank",
      strength: "required",
      holds: true,
      path: "layout.hints[0]",
      origin: "stated",
    });
    resolved.nodes.b.box[direction === "down" ? 1 : 0] += 1;
    const report = check(map, resolved);
    expect(report.constraints[0]).toMatchObject({ holds: false });
    expect(report.hard).toBe(1);
    expect(describeDefects(report)).toEqual([
      expect.stringMatching(/layout\.hints\[0\].*sameRank.*a.*b/s),
    ]);
    expect(check(source(undefined, direction), resolved).hard).toBe(0);
    expect(
      describeDefects(check(source(undefined, direction), resolved)),
    ).toEqual([]);
    delete resolved.nodes.b;
    expect(() => check(map, resolved)).toThrow(/different nodes/);
  });
}

test("hand geometry and refinement retain hints without enforcing placement", async () => {
  const map = drawing("down", "required");
  map.nodes.b.box[1] = 100;
  expect(
    await layout(map, dagreEngine, {
      onUnsupportedHints: () => {
        throw new Error("Hand hints are metadata");
      },
    }),
  ).toEqual(map);
  const refined = refine(map, fontTableMeasurer);
  expect(refined.layout).toEqual(map.layout);
  expect(refined.nodes).toEqual(map.nodes);
  expect(check(map, refined).constraints[0]).toMatchObject({ holds: false });
});

test("the pipeline aligns a custom placer's result without trusting its support claim", async () => {
  const engine = {
    name: "misaligned",
    capabilities: { sameRank: "required" as const },
    layout: dagreEngine.layout,
    place: async () => ({
      nodes: { a: [0, 0, 100, 100], b: [200, 200, 100, 100] },
      lanes: {},
      edges: {},
    }),
  };
  const map = source("required");
  const resolved = await layout(map, engine);
  expect(resolved.nodes.a.box[1]).toBe(resolved.nodes.b.box[1]);
  expect(check(map, resolved).constraints[0].holds).toBe(true);
});

test("duplicate hint nodes name the string-array entry", async () => {
  const map = source();
  map.layout.hints[0].nodes = ["a", "a"];
  await expect(layout(map, dagreEngine)).rejects.toThrow(
    /layout\.hints\[0\]\.nodes\[1\]: duplicate node/,
  );
});
