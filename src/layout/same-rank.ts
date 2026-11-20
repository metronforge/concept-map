import type { Constraint, LayoutProblem } from "./problem.js";
import type { LayoutGraph, LayoutResult } from "./types.js";
import { alignBoxes } from "./relations/align.js";
import type { AlignedBoxes } from "./relations/apply.js";
import type { RelationSolution } from "./relations/result.js";
import { rerouteMovedEdges } from "./moved-routes.js";

type Contradiction = Extract<RelationSolution, { status: "contradictory" }>;
type SameRankHint = Extract<Constraint, { kind: "sameRank" }>;
interface DroppedHint {
  hint: SameRankHint;
  reason: "contradiction";
  conflicts: readonly string[];
  witness: Contradiction;
}
type AlignmentOutcome =
  | (Contradiction & { message: string })
  | { status: "determined"; result: LayoutResult; dropped: DroppedHint[] };

function conflictReason(witness: Contradiction): string {
  const ids = [...new Set(witness.cycle.map((source) => source.id))];
  return `Conflicting same-rank relations: ${ids.join(", ")}`;
}

/** Required groups take priority; compatible preferences follow source order.
 * Every retry starts at engine coordinates, so rejected hints leave no moves.
 */
function selectHints(
  problem: LayoutProblem,
  original: LayoutResult,
  rankGap: number,
  nodeGap: number,
): { aligned: AlignedBoxes; dropped: DroppedHint[] } {
  const constraints = problem.constraints.map((c, i) =>
    c.kind === "sameRank" ? { ...c, path: c.path ?? `constraints[${i}]` } : c,
  );
  const accepted = constraints.filter(
    (c) => c.kind !== "sameRank" || c.strength === "required",
  );
  const solve = () =>
    alignBoxes(
      { ...problem, constraints: accepted },
      original.nodes,
      rankGap,
      nodeGap,
    );
  let aligned = solve();
  const dropped: DroppedHint[] = [];
  if (aligned.status === "contradictory") return { aligned, dropped };
  for (const hint of constraints) {
    if (hint.kind !== "sameRank" || hint.strength !== "preferred") continue;
    accepted.push(hint);
    const candidate = solve();
    if (candidate.status === "contradictory") {
      accepted.pop();
      dropped.push({
        hint,
        reason: "contradiction",
        conflicts: candidate.cycle.map((source) => source.id),
        witness: candidate,
      });
    } else aligned = candidate;
  }
  return { aligned, dropped };
}

/** Internal entry for on-demand alignment. Boundary error conversion and
 * independent checks of resolved geometry belong to the caller.
 */
export function alignSameRank(
  problem: LayoutProblem,
  graph: LayoutGraph,
  original: LayoutResult,
  rankGap: number,
  nodeGap: number,
): AlignmentOutcome {
  const { aligned, dropped } = selectHints(problem, original, rankGap, nodeGap);
  if (aligned.status === "contradictory")
    return { ...aligned, message: conflictReason(aligned) };
  return {
    status: "determined",
    result: rerouteMovedEdges(
      graph,
      original,
      aligned.nodes,
      problem.constraints,
    ),
    dropped,
  };
}
