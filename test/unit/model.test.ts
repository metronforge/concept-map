import { resolvedMaps } from "./fixtures/maps";
import { checkDerive } from "./assertions/model";
import { describe, expect, test } from "vitest";
import { test as property, fc } from "@fast-check/vitest";
import {
  reduce,
  initialState,
  type Action,
  type PlayerState,
} from "../../src/lib/concept-map/model/state";
import { derive } from "../../src/lib/concept-map/model/frame";
import { planFlow, reducedFlow } from "../../src/lib/concept-map/model/flow";
import {
  fitNodeLabels,
  fitEdgeLabel,
  labelMinimum,
} from "../../src/lib/concept-map/model/labels";
import { pathEnds } from "../../src/lib/concept-map/model/path";
import { handMaps, mapArbitrary, resolvedFixture } from "./arbitraries/map";
import type { ResolvedMap } from "../../src/lib/concept-map/schema";

const maps = [...handMaps(), ...resolvedMaps().map((m) => m.map)];
interface Model extends PlayerState {
  stepsPer: number[];
}
interface Real {
  map: ResolvedMap;
  state: PlayerState;
}
class Command implements fc.Command<Model, Real> {
  constructor(readonly action: Action) {}
  check() {
    return true;
  }
  run(m: Model, r: Real) {
    const a = this.action;
    const clampScenario = (n: number) =>
      Math.max(0, Math.min(m.stepsPer.length - 1, n));
    let step = m.step;
    switch (a.type) {
      case "reset":
        m.scenario = 0;
        step = 0;
        m.mode = "step";
        break;
      case "scenario":
        m.scenario = clampScenario(a.index);
        step = 0;
        break;
      case "concept":
        m.scenario = clampScenario(a.scenario);
        step = a.step;
        m.mode = "step";
        break;
      case "mode":
        m.mode = a.mode;
        break;
      case "go":
        step = a.step;
        break;
      case "next":
        step++;
        break;
      case "back":
        step--;
        break;
    }
    m.step = Math.max(0, Math.min(m.stepsPer[m.scenario] - 1, step));
    r.state = reduce(r.map, r.state, a);
    expect(r.state).toEqual({
      scenario: m.scenario,
      step: m.step,
      mode: m.mode,
    });
    expect(r.state.step).toBeGreaterThanOrEqual(0);
    expect(r.state.step).toBeLessThan(m.stepsPer[m.scenario]);
  }
  toString() {
    return JSON.stringify(this.action);
  }
}
const integer = fc.integer({ min: -20, max: 30 });
const actions: fc.Arbitrary<Action>[] = [
  fc.constant({ type: "next" }),
  fc.constant({ type: "back" }),
  fc.constant({ type: "reset" }),
  integer.map((step) => ({ type: "go", step })),
  integer.map((index) => ({ type: "scenario", index })),
  fc
    .constantFrom("step" as const, "all" as const)
    .map((mode) => ({ type: "mode", mode })),
  fc
    .tuple(integer, integer)
    .map(([scenario, step]) => ({ type: "concept", scenario, step })),
];
property.prop([
  mapArbitrary(maps),
  fc.commands(
    actions.map((a) => a.map((a) => new Command(a))),
    { maxCommands: 100 },
  ),
])("state follows a small independent command model", (map, commands) => {
  fc.modelRun(
    () => ({
      model: {
        ...initialState,
        stepsPer: map.scenarios.map((s) => s.steps.length),
      },
      real: { map, state: { ...initialState } },
    }),
    commands,
  );
});

property.prop([mapArbitrary(maps)])(
  "derive preserves revealed sets, current and panel rules",
  checkDerive,
);

describe("edge badge partitions", () => {
  function badge(
    edit: (m: ResolvedMap) => void,
    mode: "step" | "all" = "step",
  ) {
    const m = resolvedFixture();
    m.scenarios[0].repeatBadges = [];
    edit(m);
    return derive(m, { scenario: 0, step: 1, mode }).badges;
  }
  test("neutral case and first-revealing-step numbering", () => {
    expect(badge(() => {})).toEqual([{ x: 35, y: 70, n: 2, current: true }]);
    expect(badge((m) => (m.scenarios[0].steps[0].edges = ["ab"]))[0].n).toBe(1);
  });
  test("no badge position", () =>
    expect(badge((m) => delete m.edges.ab.badge)).toEqual([]));
  test("edge badges disabled in step but enabled in all", () => {
    expect(badge((m) => (m.scenarios[0].display.edgeBadges = false))).toEqual(
      [],
    );
    expect(
      badge((m) => (m.scenarios[0].display.edgeBadges = false), "all"),
    ).toHaveLength(1);
  });
  test("revealed by display alone has no first step and no badge", () => {
    for (const edges of ["all", "progressive"] as const)
      expect(
        badge((m) => {
          m.scenarios[0].display.edges = edges;
          m.scenarios[0].steps[1].edges = [];
        }),
      ).toEqual([]);
  });
  test("repeat replaces current edge badge, all shows both", () => {
    const m = resolvedFixture();
    expect(derive(m, { scenario: 0, step: 1, mode: "step" }).badges).toEqual([
      { x: 40, y: 80, n: 2, current: true },
    ]);
    expect(
      derive(m, { scenario: 0, step: 1, mode: "all" }).badges.map((b) => b.n),
    ).toEqual([2, 2]);
  });
  test("node badge uses first current node for an edgeless step", () => {
    const m = resolvedFixture();
    m.scenarios[0].display.nodeBadges = true;
    expect(derive(m, initialState).badges).toEqual([
      { x: 58, y: 12, n: 1, current: true },
    ]);
  });
});

property.prop([fc.double({ min: 0.01, max: 1e5, noNaN: true })])(
  "flow lengths change travel duration, never hops, logs, pauses or jumps",
  (length) => {
    const m = resolvedFixture();
    const plan = planFlow(m, 0, { length: () => length });
    const doubled = planFlow(m, 0, { length: () => length * 2 });
    expect(
      plan.hops.map((h) => ({ step: h.step, node: h.node, log: h.log })),
    ).toEqual([
      { step: 0, node: "a", log: [] },
      { step: 1, node: "b", log: ["done"] },
    ]);
    expect(plan.hops.flatMap((h) => h.log)).toEqual(
      m.scenarios[0].flow!.flatMap((h) => h.log),
    );
    plan.segments.forEach((segment, i) => {
      if (segment.type === "travel") {
        expect(segment.duration).toBe(Math.max(220, length / 0.28));
        expect(doubled.segments[i].duration).toBe(
          Math.max(220, (length * 2) / 0.28),
        );
      } else expect(doubled.segments[i]).toEqual(segment);
    });
  },
);
test("flow timings, initial pause, reverse path and failed dwell", () => {
  const m = resolvedFixture();
  m.scenarios[0].flow!.push({
    edge: "ab",
    reverse: true,
    node: "a",
    step: "end",
    fail: true,
    log: ["Error: failed"],
  });
  const plan = planFlow(m, 0, { length: () => 60 });
  expect(plan.segments[0]).toMatchObject({
    type: "pause",
    duration: 400,
    at: [35, 25],
  });
  expect(
    plan.segments.filter((s) => s.type === "pause").map((s) => s.duration),
  ).toEqual([400, 280, 280, 750]);
  const travel = plan.segments.filter((s) => s.type === "travel");
  expect(travel[0]).toMatchObject({
    reverse: false,
    from: [35, 40],
    to: [35, 100],
  });
  expect(travel[1]).toMatchObject({
    reverse: true,
    from: [35, 100],
    to: [35, 40],
  });
  expect(plan.segments.filter((s) => s.type === "jump")).toEqual([
    { type: "jump", duration: 120, from: [35, 25], to: [35, 40] },
  ]);
});
test("reduced flow preserves failure-without-visit and empty-log ageing", () => {
  const m = resolvedFixture();
  const s = m.scenarios[0];
  s.flow = [
    { node: "a", step: "start", log: ["first"] },
    { node: "b", edge: "ab", step: "end", fail: true, log: ["Error: fail"] },
    { node: "a", step: "end", log: [] },
  ];
  expect(reducedFlow(m, 0)).toEqual({
    trail: ["ab"],
    visited: ["a"],
    failed: ["b"],
    log: [
      { text: "first", kind: "old" },
      { text: "Error: fail", kind: "old" },
    ],
    lastStep: 1,
  });
  s.flow = [];
  expect(planFlow(m, 0, { length: () => 1 })).toEqual({
    segments: [],
    hops: [],
  });
  expect(reducedFlow(m, 0).lastStep).toBe(-1);
});

test("path endpoints support absolute, relative, cubic, arc and closed paths", () => {
  expect(pathEnds("M 10,20 h30 v40 c1 2 3 4 5 6")).toEqual([
    [10, 20],
    [45, 66],
  ]);
  expect(pathEnds("M1 2 Q3 4 5 6 T7 8 A10 20 30 0 1 40 50")).toEqual([
    [1, 2],
    [40, 50],
  ]);
  expect(pathEnds("m1 2 l3 4 z")).toEqual([
    [1, 2],
    [1, 2],
  ]);
});
test("label fitting restores baselines and wraps words exactly", () => {
  expect(labelMinimum(420, 350)).toBeCloseTo(12.66);
  expect(
    fitNodeLabels(
      [10, 20, 100, 40],
      { y: 22, height: 12 },
      { y: 40, height: 10 },
    ),
  ).toEqual({ main: 37, tag: 52 });
  expect(
    fitNodeLabels(
      [10, 20, 100, 20],
      { y: 22, height: 12 },
      { y: 30, height: 10 },
    ),
  ).toEqual({ main: 34, tag: 53 });
  expect(fitEdgeLabel("both loops", [100, 20], 120, 60, 10)).toEqual([
    { text: "both ", x: 100, y: 15 },
    { text: "loops", x: 100, y: 25 },
  ]);
  expect(fitEdgeLabel("both loops", [100, 20], 200, 60, 10)).toEqual(null);
});

property.prop([fc.integer({ min: -10000, max: 10000 })])(
  "jump duration follows center-to-path distance and its minimum",
  (x) => {
    const m = resolvedFixture();
    m.nodes.a.box[0] = x;
    const plan = planFlow(m, 0, { length: () => 60 });
    const jump = plan.segments.find((s) => s.type === "jump")!;
    expect(jump.duration).toBe(
      Math.max(120, Math.hypot(35 - x - 25, 15) / 0.28),
    );
  },
);
test("jumps under two units are skipped", () => {
  const m = resolvedFixture();
  m.edges.ab.path = "M35 26 V100";
  expect(
    planFlow(m, 0, { length: () => 74 }).segments.some(
      (s) => s.type === "jump",
    ),
  ).toBe(false);
});

property.prop([mapArbitrary(maps)])(
  "a first revealing step implies the edge is revealed",
  (map) => {
    map.scenarios.forEach((s, scenario) =>
      s.steps.forEach((_, step) => {
        const frame = derive(map, { scenario, step, mode: "step" });
        for (const earlier of s.steps.slice(0, step + 1))
          for (const id of earlier.edges)
            expect(frame.edges[id].revealed).toBe(true);
      }),
    );
  },
);
property.prop([mapArbitrary(maps)])(
  "flow plans and reduced routes retain authored hop order, steps and logs",
  (map) => {
    map.scenarios.forEach((s, scenario) => {
      const flow = s.flow ?? [],
        plan = planFlow(map, scenario, { length: () => 300 });
      expect(plan.hops.map((h) => h.node)).toEqual(flow.map((h) => h.node));
      expect(plan.hops.map((h) => h.step)).toEqual(
        flow.map((h) => s.steps.findIndex((t) => t.id === h.step)),
      );
      expect(plan.hops.flatMap((h) => h.log)).toEqual(
        flow.flatMap((h) => h.log),
      );
      const reduced = reducedFlow(map, scenario);
      expect(reduced.trail.slice().sort()).toEqual(
        [...new Set(flow.flatMap((h) => (h.edge ? [h.edge] : [])))].sort(),
      );
      expect(reduced.log.map((l) => l.text)).toEqual(
        flow.flatMap((h) => h.log),
      );
      expect(reduced.lastStep).toBe(
        flow.length ? s.steps.findIndex((t) => t.id === flow.at(-1)!.step) : -1,
      );
    });
  },
);

test("derive invariants hold exhaustively for every published map", () => {
  for (const { map } of resolvedMaps()) checkDerive(map);
});
