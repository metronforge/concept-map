import { expect, test } from "vitest";
import { test as property, fc } from "@fast-check/vitest";
import { ResolvedMapSchema } from "../../src/schema";
import { derive } from "../../src/model/frame";
import { reduce, initialState } from "../../src/model/state";
import { planFlow, reducedFlow } from "../../src/model/flow";
import { renderPanel } from "../../src/render/panel";
import { resolvedFixture } from "./fixtures/map";
import { resolvedMaps } from "./fixtures/maps";
const maps = resolvedMaps().map(({ map }) => map);
property.prop([fc.constantFrom(...maps), fc.integer()])(
  "I1 closed for finite integer go actions",
  (map, step) => {
    const state = reduce(map, initialState, { type: "go", step });
    expect(Number.isInteger(state.step)).toBe(true);
    expect(state.step).toBeGreaterThanOrEqual(0);
    expect(state.step).toBeLessThan(map.scenarios[0].steps.length);
  },
);
test("I1 counterexample: a number action can produce NaN or a fractional index", () => {
  for (const step of [NaN, 0.5])
    expect(
      Number.isInteger(
        reduce(resolvedFixture(), initialState, { type: "go", step }).step,
      ),
    ).toBe(false);
});
property.prop([fc.constantFrom(...maps)])(
  "I3 derive is deterministic on adapter-validated maps",
  (map) => {
    for (let scenario = 0; scenario < map.scenarios.length; scenario++)
      for (let step = 0; step < map.scenarios[scenario].steps.length; step++) {
        const state = { scenario, step, mode: "step" as const };
        const frame = derive(map, state);
        expect(frame).toEqual(derive(map, state));
        expect(Object.keys(frame.nodes)).toEqual(Object.keys(map.nodes));
        expect(Object.keys(frame.edges)).toEqual(Object.keys(map.edges));
      }
  },
);
property.prop([fc.constantFrom(...maps)])(
  "I4 revealed grows within each scenario in step mode",
  (map) => {
    map.scenarios.forEach((s, scenario) => {
      for (let step = 0; step < s.steps.length - 1; step++) {
        const a = derive(map, { scenario, step, mode: "step" }),
          b = derive(map, { scenario, step: step + 1, mode: "step" });
        for (const key of [
          "nodes",
          "edges",
          "lanes",
          "frames",
          "edgeLabels",
        ] as const)
          for (const [id, item] of Object.entries(a[key]))
            if (item.revealed) expect(b[key][id].revealed).toBe(true);
      }
    });
  },
);
test("I5 counterexample: schema and book warning permit current outside revealed", () => {
  const map = resolvedFixture();
  map.scenarios[0].steps[0].current = ["b"];
  const frame = derive(ResolvedMapSchema.parse(map), initialState);
  expect(frame.nodes.b).toMatchObject({ current: true, revealed: false });
});
property.prop([fc.constantFrom(...maps)])(
  "I6 adapter-validated hop references exist and reducedFlow computes a final result",
  (map) => {
    map.scenarios.forEach((s, scenario) => {
      const plan = planFlow(map, scenario, { length: () => 100 });
      for (const hop of plan.hops) {
        expect(map.nodes[hop.node]).toBeDefined();
        expect(s.steps[hop.step]).toBeDefined();
      }
      for (const segment of plan.segments)
        if (segment.type === "travel")
          expect(map.edges[segment.edge]).toBeDefined();
      const reduced = reducedFlow(map, scenario);
      expect(reduced).not.toHaveProperty("segments");
      expect(reduced.trail).toEqual([
        ...new Set((s.flow ?? []).flatMap((h) => (h.edge ? [h.edge] : []))),
      ]);
    });
  },
);
test("I3/I6 counterexample: resolved schema accepts dangling references", () => {
  const map = resolvedFixture();
  map.scenarios[0].flow![0].node = "absent";
  const parsed = ResolvedMapSchema.parse(map);
  expect(() => planFlow(parsed, 0, { length: () => 100 })).toThrow();
  map.scenarios[0].steps[0].show = ["absent"];
  expect(() => derive(ResolvedMapSchema.parse(map), initialState)).toThrow();
});
test("I7 resolved inline leaves escape HTML instead of trusting it", () => {
  const map = resolvedFixture();
  map.scenarios[0].steps[0].text = '<em data-proof="trusted">markup</em>';
  const parsed = ResolvedMapSchema.parse(map);
  expect(renderPanel(parsed, derive(parsed, initialState))).toContain(
    "&lt;em data-proof=&quot;trusted&quot;&gt;markup&lt;/em&gt;",
  );
});

test("I6 counterexamples: missing edge throws and missing hop step becomes -1", () => {
  const edge = resolvedFixture();
  edge.scenarios[0].flow![1].edge = "absent";
  expect(() =>
    planFlow(ResolvedMapSchema.parse(edge), 0, { length: () => 100 }),
  ).toThrow();
  const step = resolvedFixture();
  step.scenarios[0].flow![0].step = "absent";
  expect(
    planFlow(ResolvedMapSchema.parse(step), 0, { length: () => 100 }).hops[0]
      .step,
  ).toBe(-1);
});
