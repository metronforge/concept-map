/** Derived positions stay on the 1/64 grid: a + round(k * (b - a) / n)
 * in ticks, ties toward minus infinity. Error is at most half a tick (1/128
 * drawing unit). Integer division avoids floating-point products and ties.
 * These positions are computed after placement and add no solver constraints.
 */
import { prepareDerivations, roundRatio } from "./derived-input.js";
import type { DerivedPosition } from "./derived-input.js";
import type { RelationPlacement } from "./result.js";

export function derivePositions(
  placements: RelationPlacement[],
  requests: DerivedPosition[],
): RelationPlacement[] {
  return prepareDerivations(placements, requests).map(({ id, a, b, k, n }) => ({
    variable: id,
    position: Number(a + roundRatio(k * (b - a), n)) / 64,
  }));
}
