import type { SourceMap } from "../schema.js";
import type { Constraint } from "./problem.js";

/** Flow is the travel order; steps supply it when no arrows are travelled. */
function visits(map: SourceMap): { nodes: string[]; edge?: string }[] {
  const first = map.scenarios[0];
  if (first.flow?.some((hop) => hop.edge))
    return first.flow.map((hop) => {
      if (!hop.edge) return { nodes: [hop.node] };
      const edge = map.edges[hop.edge];
      const ends = hop.reverse ? [edge.to, edge.from] : [edge.from, edge.to];
      return { nodes: [...ends, hop.node], edge: hop.edge };
    });
  return [
    ...(first.flow ?? []).map((hop) => ({ nodes: [hop.node] })),
    ...first.steps.flatMap((step) => [
      ...step.edges.map((id) => ({
        nodes: [map.edges[id].from, map.edges[id].to],
        edge: id,
      })),
      { nodes: step.show },
    ]),
  ];
}

/** Preferred intent from a validated source, independent of engine geometry. */
export function deriveIntent(map: SourceMap): Constraint[] {
  const nodes = new Set<string>();
  const edges = new Set<string>();
  for (const visit of visits(map)) {
    for (const node of visit.nodes) nodes.add(node);
    if (visit.edge) edges.add(visit.edge);
  }
  for (const node of Object.keys(map.nodes)) nodes.add(node);
  const rank = new Map([...nodes].map((node, i) => [node, i]));
  return [
    { kind: "order", strength: "preferred", nodes: [...nodes] },
    { kind: "mainPath", strength: "preferred", edges: [...edges] },
    ...Object.entries(map.edges)
      .filter(([, edge]) => rank.get(edge.to)! <= rank.get(edge.from)!)
      .map(([edge]): Constraint => ({
        kind: "free",
        strength: "preferred",
        edge,
      })),
  ];
}
