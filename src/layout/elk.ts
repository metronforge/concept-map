import type { Placer } from "./ports.js";
import { orderedGraph } from "./build-problem.js";
import { reverseFreeEdges, restoreFreeEdges } from "./free-edges.js";
import ELK from "elkjs/lib/elk.bundled.js";
import type {
  ElkNode,
  ElkExtendedEdge,
  ELK as ElkApi,
} from "elkjs/lib/elk-api.js";
import type {
  LayoutEngine,
  LayoutGraph,
  LayoutResult,
  LayoutRoute,
  LayoutPoint,
} from "./types.js";
import { engineNodes, laneBoxes } from "./lanes.js";
import { routeSelfEdges } from "./self-route.js";
import { elkGraph } from "./elk-graph.js";
import { sidePorts } from "./elk-ports.js";
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
function preferModelOrder(input: ElkNode): void {
  const rank = new Map(input.children!.map((node, i) => [node.id, i]));
  for (const node of input.children!)
    for (const port of node.ports ?? []) rank.set(port.id, rank.get(node.id)!);
  // Required partitions take precedence over preferred scenario order.
  input.children!.sort(
    (a, b) =>
      Number(a.layoutOptions!["elk.partitioning.partition"]) -
      Number(b.layoutOptions!["elk.partitioning.partition"]),
  );
  input.layoutOptions!["elk.layered.cycleBreaking.strategy"] =
    "GREEDY_MODEL_ORDER";
  for (const edge of input.edges! as ElkExtendedEdge[]) {
    // Prefer cycle breaks that preserve arrows advancing through the scenario.
    if (rank.get(edge.sources[0])! < rank.get(edge.targets[0])!)
      edge.layoutOptions = {
        ...edge.layoutOptions,
        "elk.layered.priority.direction": "5",
      };
  }
}
async function layoutElk(
  graph: LayoutGraph,
  main: ReadonlySet<string> = new Set(),
  modelOrder = false,
  ports = sidePorts(graph, [], new Set()),
  pins: ReadonlyMap<string, readonly [number, number]> = new Map(),
): Promise<LayoutResult> {
  const nodes = engineNodes(graph),
    elk = new (ELK as unknown as { new (): ElkApi })();
  // Bundled ELK uses an in-process worker; there is no worker to terminate.
  {
    const input = elkGraph(graph, nodes, main, ports, pins);
    if (modelOrder) preferModelOrder(input);
    const output = await elk.layout(input);
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
    return routeSelfEdges(graph, result, ports.loops);
  }
}
const adapter: LayoutEngine & Placer = {
  name: "elk",
  capabilities: {
    direction: "preferred",
    lanes: "required",
    mainPath: "preferred",
    order: "preferred",
    side: "required",
    pin: { stated: "preferred" },
    free: {}, // Neither derived reversal nor stated hints exclude edges from ranks.
  },
  async place(problem) {
    const graph = orderedGraph(problem);
    // Reversal remains a derived preference, not literal rank exclusion.
    const free = new Set(
      problem.constraints.flatMap((c) =>
        c.kind === "free" && c.origin !== "stated" ? [c.edge] : [],
      ),
    );
    const main = new Set(
      problem.constraints
        .filter((c) => c.kind === "mainPath")
        .flatMap((c) => c.edges),
    );
    const result = await layoutElk(
      reverseFreeEdges(graph, free),
      main,
      problem.constraints.some((c) => c.kind === "order"),
      sidePorts(graph, problem.constraints, free),
      new Map(
        problem.constraints.flatMap((c) =>
          c.kind === "pin" && c.strength === "preferred"
            ? [[c.node, c.position] as const]
            : [],
        ),
      ),
    );
    return restoreFreeEdges(graph, result, free);
  },
  layout: layoutElk,
};

/** Native ELK layered partitions and orthogonal routing; no default engine chosen. */
export const elkEngine: LayoutEngine = adapter;
