import { expect, test } from "vitest";
import { SourceMapSchema } from "../../../src/schema";
import { buildProblem } from "../../../src/layout/build-problem";
import { measureLabel } from "../../../src/layout/measure";
import { place } from "../../../src/layout/place";
import { asPlacer } from "../../../src/layout/legacy";
import { dagreEngine } from "../../../src/layout/dagre";
import { elkEngine } from "../../../src/layout/elk";

function source(flow?: unknown[]) {
  return SourceMapSchema.parse({
    format: 3,
    id: "intent",
    title: "Scenario order",
    layers: { service: { label: "Service" } },
    nodes: Object.fromEntries(
      ["d", "c", "b", "a", "e"].map((id) => [
        id,
        { label: id, layer: "service" },
      ]),
    ),
    edges: {
      bc: { from: "b", to: "c" },
      ab: { from: "a", to: "b" },
      ca: { from: "c", to: "a" },
      cc: { from: "c", to: "c" },
      dc: { from: "d", to: "c" },
    },
    scenarios: [
      {
        id: "first",
        label: "First",
        flow,
        steps: [
          { id: "start", title: "Start", text: "Start", show: ["a"] },
          {
            id: "end",
            title: "End",
            text: "End",
            show: ["c", "b"],
            edges: ["ab", "bc", "ca", "ab"],
          },
        ],
      },
    ],
  });
}

function intent(map: ReturnType<typeof source>) {
  return buildProblem(map, measureLabel).constraints.filter(
    (c) => c.kind !== "direction" && c.kind !== "lanes",
  );
}

const forward = [
  { node: "a", step: "start" },
  { node: "b", step: "end", edge: "ab" },
  { node: "c", step: "end", edge: "bc" },
  { node: "a", step: "end", edge: "ca" },
  { node: "b", step: "end", edge: "ab" },
];
const expected = [
  { kind: "order", strength: "preferred", nodes: ["a", "b", "c", "d", "e"] },
  { kind: "mainPath", strength: "preferred", edges: ["ab", "bc", "ca"] },
  { kind: "free", strength: "preferred", edge: "ca" },
  { kind: "free", strength: "preferred", edge: "cc" },
  { kind: "free", strength: "preferred", edge: "dc" },
];

test("flow visits determine order and unique arrows, including return edges outside the flow", () => {
  const map = source(forward);
  // Later scenarios must not displace the first scenario's reading order.
  map.scenarios.push({
    ...map.scenarios[0],
    id: "second" as (typeof map.scenarios)[0]["id"],
    flow: [...map.scenarios[0].flow!].reverse(),
  });
  const before = structuredClone(map);
  expect(intent(map)).toEqual(expected);
  expect(intent(map)).toEqual(expected);
  expect(map).toEqual(before);
});

test("steps supply visits and arrows when there is no flow", () => {
  expect(intent(source())).toEqual(expected);
  expect(intent(source([]))).toEqual(expected);
});

test("reverse traversal orders endpoints in travel order", () => {
  const map = source([{ node: "a", step: "end", edge: "ab", reverse: true }]);
  expect(intent(map)).toEqual([
    { kind: "order", strength: "preferred", nodes: ["b", "a", "d", "c", "e"] },
    { kind: "mainPath", strength: "preferred", edges: ["ab"] },
    { kind: "free", strength: "preferred", edge: "ab" },
    { kind: "free", strength: "preferred", edge: "ca" },
    { kind: "free", strength: "preferred", edge: "cc" },
  ]);
});

test("node-only hops take their place in the reading order", () => {
  const map = source([{ node: "e", step: "start" }, ...forward]);
  expect(intent(map)[0]).toEqual({
    kind: "order",
    strength: "preferred",
    nodes: ["e", "a", "b", "c", "d"],
  });
});

test("a flow without arrows retains node visits and falls back to the steps for arrows", () => {
  const map = source([{ node: "e", step: "start" }]);
  expect(intent(map)).toEqual([
    { kind: "order", strength: "preferred", nodes: ["e", "a", "b", "c", "d"] },
    ...expected.slice(1),
  ]);
});

test("nodes without visits retain source order and no main path is invented", () => {
  const map = source();
  map.scenarios[0].steps = map.scenarios[0].steps.map((s) => ({
    ...s,
    show: [],
    edges: [],
  }));
  expect(intent(map)).toEqual([
    { kind: "order", strength: "preferred", nodes: ["d", "c", "b", "a", "e"] },
    { kind: "mainPath", strength: "preferred", edges: [] },
    { kind: "free", strength: "preferred", edge: "bc" },
    { kind: "free", strength: "preferred", edge: "ab" },
    { kind: "free", strength: "preferred", edge: "cc" },
  ]);
});

for (const engine of [dagreEngine, elkEngine])
  test(`${engine.name}: lists rank exclusion as unsupported while keeping derived preferences`, async () => {
    const outcome = await place(
      buildProblem(source(forward), measureLabel),
      asPlacer(engine),
    );
    expect(outcome).toMatchObject({
      kind: "placed",
      unsupported: expected.filter((c) => c.kind === "free"),
    });
  });
