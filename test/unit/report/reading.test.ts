import { expect, test } from "vitest";
import { ResolvedMapSchema, SourceMapSchema } from "../../../src/schema";
import { reading } from "../../../src/layout/stages/reading";

function cycle(direction: "down" | "right" = "down") {
  return ResolvedMapSchema.parse({
    format: 3,
    id: "cycle",
    title: "Visit and return",
    direction,
    viewBox: [200, 200],
    layers: { service: { label: "Service" } },
    nodes: Object.fromEntries(
      ["a", "b", "c"].map((id, i) => [
        id,
        {
          label: id,
          layer: "service",
          box: direction === "down" ? [0, i * 50, 10, 10] : [i * 50, 0, 10, 10],
        },
      ]),
    ),
    edges: Object.fromEntries(
      ["ab", "bc", "ca", "cc", "ac"].map((id) => [
        id,
        {
          from: id[0],
          to: id[1],
          path: "M0 0 L10 10",
        },
      ]),
    ),
    scenarios: [
      {
        id: "first",
        label: "First",
        steps: [
          {
            id: "visit",
            title: "Visit",
            text: "Visit",
            edges: ["ab", "bc", "ca", "cc"],
          },
        ],
        flow: [
          { node: "a", step: "visit" },
          ...["ab", "bc", "ca", "cc", "ab", "cc"].map((edge) => ({
            node: edge[1],
            step: "visit",
            edge,
          })),
        ],
      },
    ],
  });
}

for (const direction of ["down", "right"] as const)
  test(`${direction}: excludes returns from progress and counts unique loops separately`, () => {
    const map = cycle(direction);
    expect(reading(map, map, 1)).toEqual({
      edges: 3,
      forward: 2,
      share: 0.667,
      nonReturn: { edges: 2, forward: 2, share: 1 },
      returns: { edges: 1, backward: 1, share: 1, selfLoops: 1 },
    });
  });

test("reports misplaced returns rather than calling every non-forward arrow backward", () => {
  const source = cycle();
  const map = structuredClone(source);
  map.nodes.a.box[1] = 150;
  expect(reading(source, map, 1)).toMatchObject({
    nonReturn: { edges: 2, forward: 1, share: 0.5 },
    returns: { edges: 1, backward: 0, share: 0, selfLoops: 1 },
  });
  for (const delta of [-1, 0, 1]) {
    map.nodes.a.box[1] = map.nodes.c.box[1] + delta;
    expect(reading(source, map, 1).returns.backward).toBe(0);
  }
  map.nodes.a.box[1] = map.nodes.c.box[1] - 1.01;
  expect(reading(source, map, 1).returns.backward).toBe(1);
});

test("keeps traversal direction and deduplicates each edge and direction pair", () => {
  const map = cycle();
  const hop = map.scenarios[0].flow![1];
  map.scenarios[0].flow = [
    hop,
    { ...hop, node: map.edges.ab.from, reverse: true },
    hop,
  ];
  expect(reading(map, map, 1)).toEqual({
    edges: 2,
    forward: 1,
    share: 0.5,
    nonReturn: { edges: 2, forward: 1, share: 0.5 },
    returns: { edges: 0, backward: 0, share: null, selfLoops: 0 },
  });
  map.scenarios[0].flow = [{ ...hop, node: map.edges.ab.from, reverse: true }];
  expect(reading(map, map, 1)).toMatchObject({
    nonReturn: { edges: 0, forward: 0, share: null },
    returns: { edges: 1, backward: 1, share: 1, selfLoops: 0 },
  });
});

test("falls back to step arrows and accepts source and resolved maps equally", () => {
  const map = cycle();
  delete map.scenarios[0].flow;
  const { viewBox, ...semantic } = map;
  const source = SourceMapSchema.parse({
    ...semantic,
    nodes: Object.fromEntries(
      Object.entries(map.nodes).map(([id, { box, ...node }]) => [id, node]),
    ),
    edges: Object.fromEntries(
      Object.entries(map.edges).map(([id, { path, ...edge }]) => [id, edge]),
    ),
  });
  expect(reading(source, map, 1)).toEqual(reading(map, map, 1));
  expect(reading(source, map, 1)).toMatchObject({
    nonReturn: { edges: 2, forward: 2, share: 1 },
    returns: { edges: 1, backward: 1, share: 1, selfLoops: 1 },
  });
});

test("keeps node-only visits when classifying step arrows and ignores later scenarios", () => {
  const map = cycle();
  const scenario = map.scenarios[0];
  scenario.flow = [{ ...scenario.flow![0], node: map.edges.bc.to }];
  map.scenarios.push({ ...scenario, flow: cycle().scenarios[0].flow });
  expect(reading(map, map, 1)).toMatchObject({
    nonReturn: { edges: 2, forward: 1, share: 0.5 },
    returns: { edges: 1, backward: 0, share: 0, selfLoops: 1 },
  });
});

test("empty and loop-only scenarios have no directional share", () => {
  const map = cycle();
  const scenario = map.scenarios[0];
  scenario.flow = [];
  scenario.steps[0].edges = [];
  const empty = { edges: 0, forward: 0, share: null };
  expect(reading(map, map, 1)).toEqual({
    ...empty,
    nonReturn: empty,
    returns: { edges: 0, backward: 0, share: null, selfLoops: 0 },
  });
  scenario.flow = cycle().scenarios[0].flow!.filter((hop) => hop.edge === "cc");
  expect(reading(map, map, 1)).toEqual({
    ...empty,
    nonReturn: empty,
    returns: { edges: 0, backward: 0, share: null, selfLoops: 1 },
  });
});
