import { SourceMapSchema } from "../../../src/schema.js";
import type { LayoutProblem } from "../../../src/layout/problem.js";
import type { LayoutBox, LayoutResult } from "../../../src/layout/types.js";

function sameRank(nodes: string[]) {
  return { kind: "sameRank" as const, strength: "required" as const, nodes };
}

export function laneFixture(right = false) {
  const box = (rank: number, size: number): LayoutBox =>
    right ? [rank, 0, size, 20] : [0, rank, 20, size];
  const nodes = {
    a: box(10, 20),
    b: box(50, 20),
    tail: box(50, 20),
    observer: box(170, 20),
    loose: box(230, 20),
  };
  const result: LayoutResult = {
    nodes,
    edges: {},
    lanes: { first: box(0, 80), empty: box(100, 40), last: box(160, 40) },
  };
  const problem: LayoutProblem = {
    nodes: Object.entries(nodes).map(([id, b]) => ({
      id,
      width: b[2],
      height: b[3],
      lane: id === "loose" ? undefined : id === "observer" ? "last" : "first",
    })),
    edges: [{ id: "follow", from: "a", to: "tail" }],
    groups: ["first", "empty", "last"].map((id) => ({
      id,
      label: { width: 20, height: 10 },
    })),
    constraints: [
      {
        kind: "direction",
        strength: "preferred",
        direction: right ? "right" : "down",
      },
      { ...sameRank(["a", "b"]), path: "layout.hints[0]" },
    ],
  };
  return { problem, result };
}

export function laneSource(direction: "down" | "right", crossLane: boolean) {
  const ids = crossLane
    ? ["start", "quick", "prepare", "finish"]
    : ["start", "quick", "prepare", "finish", "tail", "observer"];
  return SourceMapSchema.parse({
    format: 3,
    id: "lane-outcomes",
    title: "Outcomes in lanes",
    direction,
    layers: { work: { label: "Work" } },
    lanes: {
      first: { label: "First", layer: "work" },
      second: { label: "Second", layer: "work" },
    },
    nodes: Object.fromEntries(
      ids.map((id) => [
        id,
        {
          label: id,
          layer: "work",
          lane: id === (crossLane ? "finish" : "observer") ? "second" : "first",
        },
      ]),
    ),
    edges: {
      quick: { from: "start", to: "quick" },
      prepare: { from: "start", to: "prepare" },
      finish: { from: "prepare", to: "finish" },
      ...(!crossLane ? { tail: { from: "quick", to: "tail" } } : {}),
    },
    scenarios: [
      {
        id: "all",
        label: "All",
        steps: [{ id: "show", title: "Show", text: "", show: ids }],
      },
    ],
    layout: { hints: [sameRank(["quick", "finish"])] },
  });
}
