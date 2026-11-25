import { expect, it } from "vitest";
import { freeEdges } from "../../src/layout/route/free-edges.js";
import type { LayoutGraph } from "../../src/layout/types.js";

it("selects stated free arrows without treating derived intent as a hint", () => {
  const graph: LayoutGraph = {
    nodes: [],
    lanes: [],
    edges: [
      { id: "a", from: "x", to: "y" },
      { id: "b", from: "y", to: "x" },
      { id: "c", from: "x", to: "x" },
    ],
  };
  const selected = freeEdges(graph, [
    { kind: "free", edge: "a", strength: "preferred", origin: "stated" },
    { kind: "free", edge: "b", strength: "required", origin: "stated" },
    { kind: "free", edge: "c", strength: "preferred" },
    { kind: "free", edge: "a", strength: "required", origin: "stated" },
  ]);
  expect(selected.edges).toEqual(graph.edges.slice(0, 2));
  expect(graph.edges).toHaveLength(3);
});
