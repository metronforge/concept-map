import type { AlignmentOutcome } from "./same-rank-outcome.js";
import type { UnsupportedHint } from "./types.js";
import { SameRankContradictionError, SameRankRoutingError } from "./errors.js";

/** Internal boundary for the lazy alignment stage. Convert checked witnesses
 * to source references; expose stated-hint diagnostics to the callback.
 */
export function acceptSameRank(outcome: AlignmentOutcome) {
  if (outcome.status === "contradictory")
    throw new SameRankContradictionError({
      status: outcome.status,
      hints: outcome.hints,
      conflicts: [...new Set(outcome.cycle.map((source) => source.id))],
      message: outcome.message,
    });
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
