import { checkRelations } from "./check.js";
import { exactTicks } from "./check-witness.js";
import { prepareDerivations, roundRatio } from "./derived-input.js";
import type { DerivedPosition } from "./derived-input.js";
import type { RelationPlacement, RelationSolution } from "./result.js";
import type { RelationSystem } from "./types.js";

/** Check the supporting placement witness, then recompute each derived value.
 * Never calls the solver or derived proposer. A feasible underdetermined
 * placement is allowed; derivation does not make that placement determined.
 * Invalid relation systems throw; invalid derivations or claims return false.
 */
export function checkDerivedPositions(
  system: RelationSystem,
  solution: RelationSolution,
  requests: DerivedPosition[],
  claim: RelationPlacement[],
): boolean {
  if (!checkRelations(system, solution)) return false;
  if (solution.status === "contradictory") return false;
  try {
    const inputs = prepareDerivations(solution.placements, requests);
    if (claim.length !== inputs.length) return false;
    const values = new Map<string, bigint>();
    for (const placement of claim) {
      const value = exactTicks(placement.position);
      if (value === undefined || values.has(placement.variable)) return false;
      values.set(placement.variable, value);
    }
    return inputs.every(
      ({ id, a, b, k, n }) =>
        values.get(id) === roundRatio(a * n + k * (b - a), n),
    );
  } catch {
    return false;
  }
}
