import { expect, it } from "vitest";
import { channelInput } from "../../src/layout/route/channel-input.js";

it("keeps translated ports and their outward sides after boxes move", () => {
  const graph = {
    nodes: [],
    lanes: [],
    edges: [{ id: "ab", from: "a", to: "b" }],
  };
  const original = {
    nodes: { a: [0, 0, 10, 10], b: [30, 0, 10, 10] },
    lanes: {},
    edges: {
      ab: {
        points: [
          [10, 10],
          [20, 10],
          [28, 5],
        ],
      },
    },
  } as import("../../src/layout/types.js").LayoutResult;
  expect(
    channelInput(graph, original, { a: [0, 20, 10, 10], b: [30, 0, 10, 10] }),
  ).toEqual({
    nodes: [
      { id: "a", box: [0, 20, 10, 10] },
      { id: "b", box: [30, 0, 10, 10] },
    ],
    edges: [
      {
        id: "ab",
        from: {
          id: "a",
          kind: "node",
          point: [10, 30],
          sides: ["right", "bottom"],
        },
        to: { id: "b", kind: "node", point: [28, 5], sides: ["left"] },
      },
    ],
  });
});

it("rejects an arrow without engine ports so the caller can fall back", () => {
  const graph = {
    nodes: [],
    lanes: [],
    edges: [{ id: "ab", from: "a", to: "b" }],
  };
  const nodes: import("../../src/layout/types.js").LayoutResult["nodes"] = {
    a: [0, 0, 10, 10],
    b: [30, 0, 10, 10],
  };
  expect(
    channelInput(graph, { nodes, edges: {}, lanes: {} }, nodes),
  ).toBeNull();
  expect(
    channelInput(
      graph,
      { nodes, edges: { ab: { points: [] } }, lanes: {} },
      nodes,
    ),
  ).toBeNull();
});
