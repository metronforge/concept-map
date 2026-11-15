import { expect, test, vi } from "vitest";
import { layout } from "../../../src/layout/index";
import { sourceFixture } from "./fixture";
import type { SourceMap } from "../../../src/schema";

const cases: [string, string, (map: SourceMap) => void][] = [
  [
    "edges.ab.from",
    "node",
    (m) => {
      m.edges.ab.from = "gest";
    },
  ],
  [
    "edges.ab.to",
    "node",
    (m) => {
      m.edges.ab.to = "gest";
    },
  ],
  [
    "nodes.a.lane",
    "lane",
    (m) => {
      m.nodes.a.lane = "gest";
    },
  ],
  [
    "frames.outer.showWith",
    "node",
    (m) => {
      m.frames.outer.showWith = ["gest"];
    },
  ],
  [
    "scenarios[0].steps[1].show",
    "node",
    (m) => {
      m.scenarios[0].steps[1].show = ["gest"];
    },
  ],
  [
    "scenarios[0].steps[1].current",
    "node",
    (m) => {
      m.scenarios[0].steps[1].current = ["gest"];
    },
  ],
  [
    "scenarios[0].steps[1].edges",
    "edge",
    (m) => {
      m.scenarios[0].steps[1].edges = ["gest"];
    },
  ],
  [
    "scenarios[0].steps[1].defs",
    "definition",
    (m) => {
      m.scenarios[0].steps[1].defs = ["gest"];
    },
  ],
  [
    "scenarios[0].steps[1].code",
    "code",
    (m) => {
      m.scenarios[0].steps[1].code = "gest";
    },
  ],
  [
    "scenarios[0].flow[0].node",
    "node",
    (m) => {
      m.scenarios[0].flow![0].node = "gest";
    },
  ],
  [
    "scenarios[0].flow[0].step",
    "step",
    (m) => {
      m.scenarios[0].flow![0].step = "gest";
    },
  ],
  [
    "scenarios[0].flow[0].edge",
    "edge",
    (m) => {
      m.scenarios[0].flow![0].edge = "gest";
    },
  ],
  [
    "scenarios[0].nodeLabels.gest",
    "node",
    (m) => {
      m.scenarios[0].nodeLabels = { gest: "Guest" };
    },
  ],
  [
    "scenarios[0].repeatBadges[0].edge",
    "edge",
    (m) => {
      m.scenarios[0].repeatBadges![0].edge = "gest";
    },
  ],
  [
    "scenarios[0].repeatBadges[0].step",
    "step",
    (m) => {
      m.scenarios[0].repeatBadges![0].step = "gest";
    },
  ],
  [
    "callouts.1",
    "node",
    (m) => {
      m.callouts["1"] = ["gest"];
    },
  ],
  [
    "conceptScenario",
    "scenario",
    (m) => {
      m.conceptScenario = "gest";
    },
  ],
  [
    "concepts[0].items[0].definition",
    "definition",
    (m) => {
      m.concepts[0].items[0].definition = "gest";
    },
  ],
  [
    "concepts[0].items[0].nodes",
    "node",
    (m) => {
      m.concepts[0].items[0].nodes = ["gest"];
    },
  ],
  [
    "concepts[0].items[0].step.scenario",
    "scenario",
    (m) => {
      m.concepts[0].items[0].step.scenario = "gest";
    },
  ],
  [
    "concepts[0].items[0].step.step",
    "step",
    (m) => {
      m.concepts[0].items[0].step.step = "gest";
    },
  ],
];

test.each(cases)(
  "%s rejects unknown %s before measurement or engine invocation",
  async (path, kind, mutate) => {
    const map = sourceFixture();
    mutate(map);
    const engine = { layout: vi.fn() },
      measureLabel = vi.fn();
    await expect(layout(map, engine, { measureLabel })).rejects.toThrow(
      `${path}: unknown ${kind} “gest”`,
    );
    expect(engine.layout).not.toHaveBeenCalled();
    expect(measureLabel).not.toHaveBeenCalled();
  },
);

test("duplicate scenario and step identifiers are rejected", async () => {
  const map = sourceFixture(),
    engine = { layout: vi.fn() };
  map.scenarios.push(structuredClone(map.scenarios[0]));
  await expect(layout(map, engine)).rejects.toThrow(
    "scenarios[1].id: duplicate scenario “normal”",
  );
  map.scenarios.pop();
  map.scenarios[0].steps[1].id = "start";
  await expect(layout(map, engine)).rejects.toThrow(
    "scenarios[0].steps[1].id: duplicate step “start”",
  );
});

test("step references are scoped to their scenario, not globally", async () => {
  const map = sourceFixture();
  map.scenarios.push({ ...structuredClone(map.scenarios[0]), id: "other" });
  map.scenarios[1].steps[0].id = "elsewhere";
  map.scenarios[0].flow![0].step = "elsewhere";
  await expect(layout(map, { layout: vi.fn() })).rejects.toThrow(
    "scenarios[0].flow[0].step: unknown step “elsewhere”",
  );
});
