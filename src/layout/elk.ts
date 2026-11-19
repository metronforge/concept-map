import type { Placer } from "./ports.js";
import { problemGraph } from "./build-problem.js";
import ELK from "elkjs/lib/elk.bundled.js";
import type {
  ElkNode,
  ElkExtendedEdge,
  ELK as ElkApi,
} from "elkjs/lib/elk-api.js";
import type {
  LayoutEngine,
  LayoutGraph,
  LayoutNode,
  LayoutEdge,
  LayoutResult,
  LayoutRoute,
  LayoutPoint,
} from "./types.js";
import { engineNodes, laneBoxes } from "./lanes.js";
import { routeSelfEdges } from "./self-route.js";
const elkOptions = {
  "elk.algorithm": "layered",
  "elk.edgeRouting": "ORTHOGONAL",
  "elk.randomSeed": "1",
  "elk.separateConnectedComponents": "false",

  "elk.layered.spacing.nodeNodeBetweenLayers": "64",
  "elk.spacing.nodeNode": "32",
};
// ELK skips empty label text; a placeholder retains geometry for size-only labels.
function elkEdge(e: LayoutEdge, main: ReadonlySet<string>): ElkExtendedEdge {
  return {
    id: `e:${e.id}`,
    sources: [`n:${e.from}`],
    targets: [`n:${e.to}`],
    ...(main.has(e.id)
      ? { layoutOptions: { "elk.layered.priority.straightness": "5" } }
      : {}),
    ...(e.label
      ? {
          labels: [
            {
              id: `$label:${e.id}`,
              text: e.label.text || "label",
              layoutOptions: { "elk.edgeLabels.placement": "CENTER" },
              width: e.label.width,
              height: e.label.height,
            },
          ],
        }
      : {}),
  };
}
function elkGraph(
  graph: LayoutGraph,
  nodes: LayoutNode[],
  main: ReadonlySet<string>,
): ElkNode {
  return {
    id: "$root",
    layoutOptions: {
      ...elkOptions,
      "elk.direction": graph.direction === "right" ? "RIGHT" : "DOWN",
      "elk.partitioning.activate": String(graph.lanes.length > 0),
    },
    children: nodes.map((n) => ({
      id: `n:${n.id}`,
      width: n.width,
      height: n.height,
      layoutOptions: {
        "elk.partitioning.partition": String(
          n.lane === undefined
            ? graph.lanes.length
            : graph.lanes.findIndex((l) => l.id === n.lane),
        ),
      },
    })),
    edges: graph.edges.map((e) => elkEdge(e, main)),
  };
}
function route(edge: ElkExtendedEdge): LayoutRoute {
  const section = edge.sections?.[0];
  if (!section || edge.sections!.length !== 1)
    throw new Error(`ELK edge “${edge.id}”: expected one connected route`);
  const points: LayoutPoint[] = [
    section.startPoint,
    ...(section.bendPoints ?? []),
    section.endPoint,
  ].map((p) => [p.x, p.y]);
  const label = edge.labels?.[0];
  return {
    points,
    ...(label
      ? {
          label: [
            (label.x ?? NaN) + (label.width ?? 0) / 2,
            (label.y ?? NaN) + (label.height ?? 0) / 2,
          ] as LayoutPoint,
        }
      : {}),
  };
}
async function layoutElk(
  graph: LayoutGraph,
  main: ReadonlySet<string> = new Set(),
): Promise<LayoutResult> {
  const nodes = engineNodes(graph),
    elk = new (ELK as unknown as { new (): ElkApi })();
  // Bundled ELK uses an in-process worker; there is no worker to terminate.
  {
    const output = await elk.layout(elkGraph(graph, nodes, main));
    const result: LayoutResult = { nodes: {}, edges: {}, lanes: {} };
    for (const n of output.children ?? [])
      result.nodes[n.id.slice(2)] = [
        n.x ?? NaN,
        n.y ?? NaN,
        n.width ?? NaN,
        n.height ?? NaN,
      ];
    for (const e of output.edges ?? []) result.edges[e.id.slice(2)] = route(e);
    result.lanes = laneBoxes(graph, nodes, result.nodes);
    for (const n of nodes) if (n.id.startsWith("$")) delete result.nodes[n.id];
    return routeSelfEdges(graph, result);
  }
}
const adapter: LayoutEngine & Placer = {
  name: "elk",
  capabilities: {
    direction: "preferred",
    lanes: "required",
    mainPath: "preferred",
  },
  place(problem) {
    const main = new Set(
      problem.constraints
        .filter((c) => c.kind === "mainPath")
        .flatMap((c) => c.edges),
    );
    return layoutElk(problemGraph(problem), main);
  },
  layout: layoutElk,
};

/** Native ELK layered partitions and orthogonal routing; no default engine chosen. */
export const elkEngine: LayoutEngine = adapter;
