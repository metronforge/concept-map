import { normalizeRelations } from "./normalize.js";
import {
  checkChain,
  checkCycle,
  checkShift,
  exactTicks,
  satisfies,
} from "./check-witness.js";
import type { RelationPlacement, RelationSolution } from "./result.js";
import type { RelationGraph, RelationSystem } from "./types.js";

function readCoordinates(
  graph: RelationGraph,
  placements: RelationPlacement[],
) {
  if (placements.length !== graph.variables.length) return undefined;
  const values = new Map<number, bigint>([[0, 0n]]);
  for (const placement of placements) {
    const index = graph.variables.indexOf(placement.variable) + 1;
    const value = exactTicks(placement.position);
    if (index === 0 || values.has(index) || value === undefined)
      return undefined;
    values.set(index, value);
  }
  return [0n, ...graph.variables.map((_, i) => values.get(i + 1)!)];
}

function checkClaim(graph: RelationGraph, claim: RelationSolution): boolean {
  if (claim.status === "contradictory")
    return checkCycle(graph, claim.cycle, claim.sum);
  if (claim.status !== "determined" && claim.status !== "underdetermined")
    return false;
  const coordinates = readCoordinates(graph, claim.placements);
  if (!coordinates || !satisfies(graph, coordinates)) return false;
  if (claim.status === "underdetermined")
    return checkShift(graph, coordinates, claim.shift);
  return claim.placements.every((placement) =>
    checkChain(
      graph,
      placement.chain,
      graph.variables.indexOf(placement.variable) + 1,
      coordinates,
    ),
  );
}

/** Independently check a claim, without solving or consulting solver state.
 * Only source normalization is shared; every bound and witness is checked here.
 * Invalid source inputs throw as in solveRelations; malformed claims return false.
 */
export function checkRelations(
  system: RelationSystem,
  claim: RelationSolution,
): boolean {
  const graph = normalizeRelations(system);
  try {
    return checkClaim(graph, claim);
  } catch {
    return false;
  }
}
