import { expect, test } from "vitest";
import { planFlow } from "../../src/model/flow";
import { retargetFlow } from "../../src/model/retarget-flow";
import { resolvedFixture } from "./fixtures/map";

for (const reverse of [false, true])
  test(`retargets ${reverse ? "reverse" : "forward"} travel without changing phases or timing`, () => {
    const original = resolvedFixture();
    original.scenarios[0].flow![1].reverse = reverse;
    const plan = planFlow(original, 0, { length: () => 60 });
    const saved = structuredClone(plan);
    const map = structuredClone(original);
    map.nodes.a.box = [50, 60, 80, 50];
    map.edges.ab.path = "M90 110 L250 160";
    const next = retargetFlow(plan, map, 0);
    expect(next.segments).toEqual([
      { type: "pause", duration: 400, at: [90, 85] },
      { type: "pause", duration: 280, at: [90, 85] },
      {
        ...plan.segments[2],
        from: [90, 85],
        to: reverse ? [250, 160] : [90, 110],
      },
      {
        ...plan.segments[3],
        from: reverse ? [250, 160] : [90, 110],
        to: reverse ? [90, 110] : [250, 160],
      },
      { type: "pause", duration: 280, at: reverse ? [90, 110] : [250, 160] },
    ]);
    expect(next.hops).toEqual(plan.hops);
    expect(plan).toEqual(saved);
    expect(retargetFlow(next, original, 0)).toEqual(plan);
  });

test("keeps node-only jumps and omitted jumps in their original phases", () => {
  const original = resolvedFixture();
  delete original.scenarios[0].flow![1].edge;
  const plan = planFlow(original, 0, { length: () => 0 });
  const map = structuredClone(original);
  map.nodes.a.box = [100, 100, 50, 30];
  map.nodes.b.box = [100, 100, 50, 30];
  const next = retargetFlow(plan, map, 0);
  expect(next.segments).toEqual([
    { ...plan.segments[0], at: [125, 115] },
    { ...plan.segments[1], at: [125, 115] },
    { ...plan.segments[2], from: [125, 115], to: [125, 115] },
    { ...plan.segments[3], at: [125, 115] },
  ]);
  expect(next.hops).toEqual(plan.hops);
  expect(retargetFlow(next, original, 0)).toEqual(plan);
});

test("an empty flow stays empty", () => {
  const map = resolvedFixture();
  map.scenarios[0].flow = [];
  const plan = planFlow(map, 0, { length: () => 0 });
  expect(retargetFlow(plan, map, 0)).toEqual(plan);
});

test("does not insert a newly needed jump into an active plan", () => {
  const original = resolvedFixture();
  original.edges.ab.path = "M35 25 V100";
  const plan = planFlow(original, 0, { length: () => 75 });
  expect(plan.segments.map((segment) => segment.type)).toEqual([
    "pause",
    "pause",
    "travel",
    "pause",
  ]);
  const next = structuredClone(original);
  next.edges.ab.path = "M90 110 L250 160";
  const result = retargetFlow(plan, next, 0);
  expect(result.hops).toEqual(plan.hops);
  expect(result.segments.map((segment) => segment.type)).toEqual(
    plan.segments.map((segment) => segment.type),
  );
  expect(result.segments[2]).toEqual({
    ...plan.segments[2],
    from: [90, 110],
    to: [250, 160],
  });
});

test("preserves a pause when a nearby node's jump was omitted", () => {
  const map = resolvedFixture();
  delete map.scenarios[0].flow![1].edge;
  map.nodes.b.box = [11, 10, 50, 30];
  const plan = planFlow(map, 0, { length: () => 0 });
  expect(plan.segments.at(-1)).toMatchObject({ at: [35, 25] });
  expect(retargetFlow(plan, map, 0)).toEqual(plan);
  const next = structuredClone(map);
  next.nodes.b.box = [100, 100, 50, 30];
  const changed = retargetFlow(plan, next, 0);
  expect(changed.segments.at(-1)).toMatchObject({ at: [125, 115] });
  expect(retargetFlow(changed, map, 0)).toEqual(plan);
});
