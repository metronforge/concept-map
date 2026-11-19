import { normalizeRelations } from "./normalize.js";
import { longestPaths, positiveCycle } from "./paths.js";
import type { RelationSolution } from "./result.js";
import type { RelationGraph, RelationSource, RelationSystem } from "./types.js";

/** Traverse tight edges from the origin once, avoiding cycles of zero weight. */
function tightChains(graph: RelationGraph, distances: number[]) {
  const chains = new Map<number, RelationSource[]>([[0, []]]);
  const queue = [0];
  for (let i = 0; i < queue.length; i++) {
    const from = queue[i];
    for (const edge of graph.edges) {
      if (edge.from !== from || chains.has(edge.to)) continue;
      if (distances[edge.to] !== distances[from] + edge.weight) continue;
      chains.set(edge.to, [...chains.get(from)!, edge.source]);
      queue.push(edge.to);
    }
  }
  return chains;
}

function feasibleResult(
  graph: RelationGraph,
  feasible: number[],
): RelationSolution {
  const initial = [0, ...graph.variables.map(() => -Infinity)];
  const { distances } = longestPaths(graph, initial);
  const free = graph.variables.filter((_, i) => distances[i + 1] === -Infinity);
  if (free.length) {
    return {
      status: "underdetermined",
      placements: graph.variables.map((variable, i) => ({
        variable,
        position: (feasible[i + 1] - feasible[0]) / 64,
      })),
      // No edge enters this set from an origin-reachable vertex. Moving the
      // whole set down preserves internal bounds and relaxes outgoing ones.
      shift: { variables: free, delta: -1 / 64 },
    };
  }
  const chains = tightChains(graph, distances);
  return {
    status: "determined",
    placements: graph.variables.map((variable, i) => ({
      variable,
      position: distances[i + 1] / 64,
      chain: chains.get(i + 1)!,
    })),
  };
}

/** Internal proposal only: independent witness checking is a separate step. */
export function solveRelations(system: RelationSystem): RelationSolution {
  const graph = normalizeRelations(system);
  // Starting everywhere detects contradictions outside the anchored component.
  const initial = Array<number>(graph.variables.length + 1).fill(0);
  const paths = longestPaths(graph, initial);
  if (paths.changed !== undefined) {
    const cycle = positiveCycle(paths.predecessors, paths.changed);
    return {
      status: "contradictory",
      cycle: cycle.map((edge) => edge.source),
      sum: cycle.reduce((sum, edge) => sum + edge.weight, 0) / 64,
    };
  }
  return feasibleResult(graph, paths.distances);
}
