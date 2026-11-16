import type { ResolvedMap, SourceMap } from "../../schema.js";

export interface Reading {
  edges: number;
  forward: number;
  share: number | null;
}

/** The arrows of the first scenario in order, with the way each is travelled. */
function mainPath(source: SourceMap | ResolvedMap) {
  const first = source.scenarios[0];
  // The flow says which way each arrow is travelled; without one, the arrows
  // of the steps in order, each from its start to its end.
  return first.flow?.some((hop) => hop.edge)
    ? first.flow.flatMap((hop) =>
        hop.edge ? [{ edge: hop.edge, reverse: !!hop.reverse }] : [],
      )
    : first.steps.flatMap((step) =>
        step.edges.map((edge) => ({ edge, reverse: false })),
      );
}

/** How many arrows of the main path point down, or right for `direction: "right"`. */
export function reading(
  source: SourceMap | ResolvedMap,
  resolved: ResolvedMap,
  tolerance: number,
): Reading {
  const axis = (source.direction ?? "down") === "right" ? 0 : 1;
  const centre = (id: string) => {
    const b = resolved.nodes[id].box;
    return b[axis] + b[axis + 2] / 2;
  };
  const seen = new Set<string>();
  let edges = 0,
    forward = 0;
  for (const { edge, reverse } of mainPath(source)) {
    const e = source.edges[edge];
    const key = `${edge}:${reverse ? 1 : 0}`;
    if (e.from === e.to || seen.has(key)) continue;
    seen.add(key);
    const [from, to] = reverse ? [e.to, e.from] : [e.from, e.to];
    edges++;
    if (centre(to) - centre(from) > tolerance) forward++;
  }
  return {
    edges,
    forward,
    share: edges ? Math.round((forward / edges) * 1000) / 1000 : null,
  };
}
