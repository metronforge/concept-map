import type { LayoutGraph, LayoutNode, LayoutEdge } from "./types.js";
import type { sidePorts } from "./elk-ports.js";

const elkOptions = {
  "elk.algorithm": "layered",
  "elk.edgeRouting": "ORTHOGONAL",
  "elk.randomSeed": "1",
  "elk.separateConnectedComponents": "false",

  "elk.layered.spacing.nodeNodeBetweenLayers": "64",
  "elk.spacing.nodeNode": "32",
};
const interactiveOptions = {
  "elk.layered.layering.strategy": "INTERACTIVE",
  "elk.layered.nodePlacement.strategy": "INTERACTIVE",
};
function pinnedPosition(
  node: LayoutNode,
  pins: ReadonlyMap<string, readonly [number, number]>,
) {
  const at = pins.get(node.id);
  return at ? { x: at[0] - node.width / 2, y: at[1] - node.height / 2 } : {};
}
// ELK skips empty label text; a placeholder retains geometry for size-only labels.
function elkEdge(e: LayoutEdge, main: ReadonlySet<string>) {
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
export function elkGraph(
  graph: LayoutGraph,
  nodes: LayoutNode[],
  main: ReadonlySet<string>,
  ports: ReturnType<typeof sidePorts>,
  pins: ReadonlyMap<string, readonly [number, number]> = new Map(),
) {
  return {
    id: "$root",
    layoutOptions: {
      ...elkOptions,
      "elk.direction": graph.direction === "right" ? "RIGHT" : "DOWN",
      "elk.partitioning.activate": String(graph.lanes.length > 0),
      ...(pins.size ? interactiveOptions : {}),
    },
    children: nodes.map((n) => ({
      id: `n:${n.id}`,
      width: n.width,
      height: n.height,
      ...pinnedPosition(n, pins),
      ...(ports.nodes.has(n.id) ? { ports: ports.nodes.get(n.id) } : {}),
      layoutOptions: {
        ...(ports.nodes.has(n.id)
          ? { "elk.portConstraints": "FIXED_SIDE" }
          : {}),
        "elk.partitioning.partition": String(
          n.lane === undefined
            ? graph.lanes.length
            : graph.lanes.findIndex((l) => l.id === n.lane),
        ),
      },
    })),
    edges: graph.edges.map((e) => ({
      ...elkEdge(e, main),
      ...ports.edges.get(e.id),
    })),
  };
}
