import { graphlib, layout as runLayout } from "@dagrejs/dagre";
import type { GraphLabel, NodeLabel, EdgeLabel, Point } from "@dagrejs/dagre";
import type {
  LayoutEngine,
  LayoutResult,
  LayoutPoint,
  LayoutGraph,
  LayoutNode,
} from "./types.js";
import { engineNodes, partitionDagre } from "./lanes.js";
function dagreGraph(graph: LayoutGraph, nodes: LayoutNode[]) {
  const g = new graphlib.Graph<GraphLabel, NodeLabel, EdgeLabel, Point>({
    multigraph: true,
  });
  g.setGraph({
    rankdir: graph.direction === "right" ? "LR" : "TB",
    ranksep: 64,
    nodesep: 32,
    marginx: 16,
    marginy: 32,
  });
  for (const n of nodes)
    g.setNode(`n:${n.id}`, { width: n.width, height: n.height });
  for (const e of graph.edges)
    g.setEdge(
      `n:${e.from}`,
      `n:${e.to}`,
      {
        width: e.label?.width ?? 0,
        height: e.label?.height ?? 0,
        labelpos: "c",
      },
      `e:${e.id}`,
    );
  return g;
}
/** Explicit Dagre adapter; never imported by the player or layout entry point. */
export const dagreEngine: LayoutEngine = {
  async layout(graph) {
    const nodes = engineNodes(graph);
    const g = dagreGraph(graph, nodes);
    runLayout(g);
    const result: LayoutResult = { nodes: {}, edges: {}, lanes: {} };
    for (const n of nodes) {
      const b = g.node(`n:${n.id}`);
      result.nodes[n.id] = [
        (b.x ?? NaN) - b.width / 2,
        (b.y ?? NaN) - b.height / 2,
        b.width,
        b.height,
      ];
    }
    for (const e of graph.edges) {
      const route = g.edge({
        v: `n:${e.from}`,
        w: `n:${e.to}`,
        name: `e:${e.id}`,
      });
      result.edges[e.id] = {
        points: (route.points ?? []).map(
          (p: Point) => [p.x, p.y] as LayoutPoint,
        ),
        ...(e.label && route.x !== undefined && route.y !== undefined
          ? { label: [route.x ?? NaN, route.y ?? NaN] as LayoutPoint }
          : {}),
      };
    }
    return partitionDagre(graph, nodes, result);
  },
};
