import { normalizeRelations } from "./normalize.js";
import { longestPaths } from "./paths.js";
import { solveRelations } from "./solve.js";
import type { RelationSolution } from "./result.js";
import type { RelationEdge, RelationGraph, RelationSystem } from "./types.js";

export interface RelationVerdict {
  id: string;
  status: "adds-information" | "redundant" | "contradicts";
}

export interface RelationExplanation {
  /** A status witness using only anchors and the judged relation prefix. */
  solution: RelationSolution;
  /** Source order; empty if anchors contradict, ends at the first conflict. */
  verdicts: RelationVerdict[];
}

/** A bound is implied iff an existing path is at least as strong.
 * Test every directed bound of an equality against the same prior graph.
 * Comparing compact coordinates alone would miss information in slack bounds.
 */
function implies(graph: RelationGraph, bounds: RelationEdge[]): boolean {
  return bounds.every((edge) => {
    const initial = Array<number>(graph.variables.length + 1).fill(-Infinity);
    initial[edge.from] = 0;
    return longestPaths(graph, initial).distances[edge.to] >= edge.weight;
  });
}

/** Internal ordered diagnostics. checkRelations independently checks solution;
 * verdicts describe implication by preceding relations, not just one placement.
 * Contradictory anchors close the report before any relation is judged.
 */
export function explainRelations(system: RelationSystem): RelationExplanation {
  const graph = normalizeRelations(system);
  const prior = {
    ...graph,
    edges: graph.edges.filter((edge) => edge.source.kind === "anchor"),
  };
  let solution = solveRelations({ ...system, relations: [] });
  const verdicts: RelationVerdict[] = [];
  for (const [i, relation] of system.relations.entries()) {
    if (solution.status === "contradictory") break;
    const bounds = graph.edges.filter(
      (edge) =>
        edge.source.kind === "relation" && edge.source.id === relation.id,
    );
    solution = solveRelations({
      ...system,
      relations: system.relations.slice(0, i + 1),
    });
    const status =
      solution.status === "contradictory"
        ? "contradicts"
        : implies(prior, bounds)
          ? "redundant"
          : "adds-information";
    verdicts.push({ id: relation.id, status });
    prior.edges.push(...bounds);
  }
  return { solution, verdicts };
}
