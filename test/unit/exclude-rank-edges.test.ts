import { expect, it } from "vitest";
import { excludeRankEdges } from "../../src/layout/route/exclude-rank-edges.js";
import type { LayoutGraph } from "../../src/layout/types.js";

it("removes only selected arrows from the graph sent for rank placement", () => {
  const graph: LayoutGraph = {
    direction: "right",
    nodes: [
      { id: "a", width: 10, height: 10 },
      { id: "b", width: 10, height: 10 },
    ],
    edges: [
      { id: "forward", from: "a", to: "b" },
      { id: "return", from: "b", to: "a" },
      { id: "loop", from: "a", to: "a" },
    ],
    lanes: [],
  };
  const result = excludeRankEdges(graph, new Set(["return", "loop"]));
  expect(result).toEqual({ ...graph, edges: [graph.edges[0]] });
  expect(graph.edges).toHaveLength(3);
});
