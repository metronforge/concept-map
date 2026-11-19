import type { Constraint } from "./problem.js";
import type { LayoutGraph } from "./types.js";

type SideHint = Extract<Constraint, { kind: "side" }>;
const compass = { top: "NORTH", right: "EAST", bottom: "SOUTH", left: "WEST" };

/** One port per edge end; a required side wins over a conflicting preference. */
export function sidePorts(
  graph: LayoutGraph,
  constraints: readonly Constraint[],
  reversed: ReadonlySet<string>,
) {
  const hints = new Map<string, SideHint>();
  for (const hint of constraints) {
    if (hint.kind !== "side") continue;
    const key = `${hint.edge}:${hint.end}`;
    if (!hints.has(key) || hint.strength === "required") hints.set(key, hint);
  }
  const nodes = new Map<string, ReturnType<typeof port>[]>();
  const edges = new Map<string, { sources?: string[]; targets?: string[] }>();
  const loops = new Set<string>();
  for (const hint of hints.values()) {
    const edge = graph.edges.find((e) => e.id === hint.edge)!;
    const end =
      reversed.has(edge.id) && edge.from !== edge.to
        ? hint.end === "from"
          ? "to"
          : "from"
        : hint.end;
    const id = `p:${edge.id}:${hint.end}`;
    const node = edge[hint.end];
    nodes.set(node, [...(nodes.get(node) ?? []), port(id, hint.side)]);
    edges.set(edge.id, {
      ...edges.get(edge.id),
      [end === "from" ? "sources" : "targets"]: [id],
    });
    if (edge.from === edge.to) loops.add(edge.id);
  }
  return { nodes, edges, loops };
}

function port(id: string, side: SideHint["side"]) {
  return {
    id,
    width: 0,
    height: 0,
    layoutOptions: { "elk.port.side": compass[side] },
  };
}
