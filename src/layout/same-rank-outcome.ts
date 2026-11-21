import type { Constraint } from "./problem.js";
import type { LayoutResult } from "./types.js";
import type { RelationSolution } from "./relations/result.js";

type Contradiction = Extract<RelationSolution, { status: "contradictory" }>;
export type SameRankHint = Extract<Constraint, { kind: "sameRank" }>;
export type DroppedHint = {
  hint: SameRankHint;
  conflicts: readonly string[];
} & (
  | { reason: "contradiction"; witness: Contradiction }
  | { reason: "unsupported" }
);
export type AlignmentCandidate =
  | (Contradiction & { message: string })
  | {
      status: "routing-failed";
      hints: readonly SameRankHint[];
      conflicts: readonly string[];
      message: string;
    }
  | { status: "determined"; result: LayoutResult };
export type AlignmentOutcome =
  | Exclude<AlignmentCandidate, { status: "determined" }>
  | { status: "determined"; result: LayoutResult; dropped: DroppedHint[] };

/** Resolve and independently inspect a rerouted candidate against the engine
 * drawing. Return the arrow ids involved in any new hard contacts.
 */
export type InspectRoutes = (candidate: LayoutResult) => readonly string[];
