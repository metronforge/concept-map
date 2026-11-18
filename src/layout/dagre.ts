import type { Placer } from "./ports.js";
import { problemGraph } from "./build-problem.js";
import dagre from "@dagrejs/dagre";
import type { GraphLabel, NodeLabel, EdgeLabel, Point } from "@dagrejs/dagre";
import type {
  LayoutEngine,
  LayoutResult,
  LayoutPoint,
  LayoutGraph,
  LayoutNode,
} from "./types.js";
import { routeSelfEdges, reservedSelfRoute } from "./self-route.js";
import { engineNodes, partitionDagre } from "./lanes.js";
function dagreGraph(
  graph: LayoutGraph,
  nodes: LayoutNode[],
  main: ReadonlySet<string>,
) {
  const g = new dagre.graphlib.Graph<GraphLabel, NodeLabel, EdgeLabel, Point>({
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
        weight: main.has(e.id) ? 5 : 1,
        width: e.label?.width ?? 0,
        height: e.label?.height ?? 0,
        // Self-edges already have a separate dummy label lane.
        labelpos: e.from === e.to ? "c" : "r",
        labeloffset: 12,
      },
      `e:${e.id}`,
    );
  return g;
}
function routedEdges(
  graph: LayoutGraph,
  g: ReturnType<typeof dagreGraph>,
  result: LayoutResult,
) {
  for (const e of graph.edges) {
    const route = g.edge({
      v: `n:${e.from}`,
      w: `n:${e.to}`,
      name: `e:${e.id}`,
    });
    result.edges[e.id] =
      e.from === e.to
        ? reservedSelfRoute(
            result.nodes[e.from],
            [route.x ?? 0, route.y ?? 0],
            e.label,
            graph.direction === "right",
          )
        : {
            points: (route.points ?? []).map(
              (p: Point) => [p.x, p.y] as LayoutPoint,
            ),
            ...(e.label && route.x !== undefined && route.y !== undefined
              ? { label: [route.x ?? NaN, route.y ?? NaN] as LayoutPoint }
              : {}),
          };
  }
}
async function layoutDagre(
  graph: LayoutGraph,
  main: ReadonlySet<string> = new Set(),
): Promise<LayoutResult> {
  const nodes = engineNodes(graph);
  const g = dagreGraph(graph, nodes, main);
  dagre.layout(g);
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
  routedEdges(graph, g, result);
  return routeSelfEdges(graph, partitionDagre(graph, nodes, result));
}
const adapter: LayoutEngine & Placer = {
  name: "dagre",
  capabilities: {
    direction: "preferred",
    lanes: "required",
    order: "preferred",
    free: "preferred",
    mainPath: "preferred",
  },
  async place(problem) {
    const graph = problemGraph(problem);
    const free = new Set(
      problem.constraints.filter((c) => c.kind === "free").map((c) => c.edge),
    );
    const order = problem.constraints.find((c) => c.kind === "order");
    if (order) {
      const rank = new Map(order.nodes.map((id, i) => [id, i]));
      // Insertion order guides dagre's cycle breaking; unlisted nodes stay last.
      graph.nodes = [...graph.nodes].sort(
        (a, b) =>
          (rank.get(a.id) ?? order.nodes.length) -
          (rank.get(b.id) ?? order.nodes.length),
      );
    }
    // Return arrows participate in forward ranking, like dagre's cycle breaker.
    // Insert them last so parallel routes keep the cycle breaker's ordering.
    graph.edges = [...graph.edges]
      .sort((a, b) => Number(free.has(a.id)) - Number(free.has(b.id)))
      .map((e) => (free.has(e.id) ? { ...e, from: e.to, to: e.from } : e));
    // Include returns: after reversal they pull with the forward path.
    const main = new Set(
      problem.constraints
        .filter((c) => c.kind === "mainPath")
        .flatMap((c) => c.edges),
    );
    const result = await layoutDagre(graph, main);
    for (const edge of graph.edges)
      if (free.has(edge.id) && edge.from !== edge.to)
        result.edges[edge.id].points.reverse();
    return result;
  },
  layout: layoutDagre,
};

/** Explicit Dagre adapter; never imported by the player or layout entry point. */
export const dagreEngine: LayoutEngine = adapter;
