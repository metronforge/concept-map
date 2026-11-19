import type { ResolvedMap, SourceMap } from "../../schema.js";
import { deriveIntent } from "../intent.js";

export interface Reading {
  edges: number;
  forward: number;
  share: number | null;
  /** First-scenario traversals excluding derived free (return) edges. */
  nonReturn: { edges: number; forward: number; share: number | null };
  /** Non-self returns travelled against the reading direction; loops separate. */
  returns: {
    edges: number;
    backward: number;
    share: number | null;
    selfLoops: number;
  };
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

function share(count: number, total: number): number | null {
  return total ? Math.round((count / total) * 1000) / 1000 : null;
}

function progress(arrows: { forward: boolean }[]) {
  const forward = arrows.filter((arrow) => arrow.forward).length;
  return {
    edges: arrows.length,
    forward,
    share: share(forward, arrows.length),
  };
}

/** Independently judge each unique edge/travel-direction pair from node centres. */
function directions(
  source: SourceMap | ResolvedMap,
  resolved: ResolvedMap,
  tolerance: number,
) {
  const axis = (source.direction ?? "down") === "right" ? 0 : 1;
  const centre = (id: string) => {
    const b = resolved.nodes[id].box;
    return b[axis] + b[axis + 2] / 2;
  };
  const free = new Set(
    deriveIntent(source).flatMap((c) => (c.kind === "free" ? [c.edge] : [])),
  );
  const seen = new Set<string>();
  return mainPath(source).flatMap(({ edge, reverse }) => {
    const e = source.edges[edge];
    const key = `${edge}:${reverse ? 1 : 0}`;
    if (seen.has(key)) return [];
    seen.add(key);
    const [from, to] = reverse ? [e.to, e.from] : [e.from, e.to];
    const delta = centre(to) - centre(from);
    return [
      {
        free: free.has(edge),
        selfLoop: from === to,
        forward: delta > tolerance,
        backward: delta < -tolerance,
      },
    ];
  });
}

/** Preserve all-arrow reading and distinguish forward progress from returns. */
export function reading(
  source: SourceMap | ResolvedMap,
  resolved: ResolvedMap,
  tolerance: number,
): Reading {
  const travelled = directions(source, resolved, tolerance);
  const arrows = travelled.filter((arrow) => !arrow.selfLoop);
  const returns = arrows.filter((arrow) => arrow.free);
  const backward = returns.filter((arrow) => arrow.backward).length;
  return {
    ...progress(arrows),
    nonReturn: progress(arrows.filter((arrow) => !arrow.free)),
    returns: {
      edges: returns.length,
      backward,
      share: share(backward, returns.length),
      selfLoops: travelled.filter((arrow) => arrow.selfLoop).length,
    },
  };
}
