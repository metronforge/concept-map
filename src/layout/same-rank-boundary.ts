import type { AlignmentOutcome } from "./same-rank-outcome.js";
import type { UnsupportedHint } from "./types.js";
import { SameRankContradictionError, SameRankRoutingError } from "./errors.js";

/** Internal boundary for the lazy alignment stage. Keep checked witnesses on
 * errors; expose only stated-hint diagnostics to the existing callback.
 */
export function acceptSameRank(outcome: AlignmentOutcome) {
  if (outcome.status === "contradictory")
    throw new SameRankContradictionError(outcome);
  if (outcome.status === "routing-failed")
    throw new SameRankRoutingError(outcome);
  const unsupported = outcome.dropped.flatMap(
    ({ hint, reason, conflicts }): UnsupportedHint[] => {
      if (hint.origin !== "stated" || hint.path === undefined) return [];
      return [
        {
          ...hint,
          origin: "stated",
          path: hint.path,
          nodes: [...hint.nodes],
          reason,
          conflicts: [...conflicts],
        },
      ];
    },
  );
  return { result: outcome.result, unsupported };
}
