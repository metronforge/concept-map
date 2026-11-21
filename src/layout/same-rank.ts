import type { Constraint, LayoutProblem } from "./problem.js";
import type { LayoutGraph, LayoutResult } from "./types.js";
import { alignLayout } from "./relations/align-layout.js";
import { rerouteMovedEdges } from "./moved-routes.js";
import type {
  AlignmentCandidate,
  AlignmentOutcome,
  DroppedHint,
  InspectRoutes,
} from "./same-rank-outcome.js";

/** Required groups take priority; compatible preferences follow source order.
 * Every retry starts at engine coordinates, so rejected hints leave no moves.
 */
function selectHints(
  constraints: Constraint[],
  attempt: (accepted: Constraint[]) => AlignmentCandidate,
): AlignmentOutcome {
  const accepted = constraints.filter(
    (c) => c.kind !== "sameRank" || c.strength === "required",
  );
  let aligned = attempt(accepted);
  const dropped: DroppedHint[] = [];
  if (aligned.status !== "determined") return aligned;
  for (const hint of constraints) {
    if (hint.kind !== "sameRank" || hint.strength !== "preferred") continue;
    accepted.push(hint);
    const candidate = attempt(accepted);
    if (candidate.status === "determined") aligned = candidate;
    else {
      accepted.pop();
      dropped.push(
        candidate.status === "contradictory"
          ? {
              hint,
              reason: "contradiction",
              conflicts: candidate.cycle.map((source) => source.id),
              witness: candidate,
            }
          : { hint, reason: "unsupported", conflicts: candidate.conflicts },
      );
    }
  }
  return { ...aligned, dropped };
}

/** Internal entry for on-demand alignment. The caller supplies independent
 * route inspection after resolving and placing annotations. Boundary error
 * conversion and required geometry constraints remain the caller's job.
 */
export function alignSameRank(
  problem: LayoutProblem,
  graph: LayoutGraph,
  original: LayoutResult,
  rankGap: number,
  nodeGap: number,
  inspectRoutes: InspectRoutes,
): AlignmentOutcome {
  const constraints = problem.constraints.map((c, i) =>
    c.kind === "sameRank" ? { ...c, path: c.path ?? `constraints[${i}]` } : c,
  );
  return selectHints(constraints, (accepted) => {
    const aligned = alignLayout(
      { ...problem, constraints: accepted },
      original,
      rankGap,
      nodeGap,
    );
    if (aligned.status === "contradictory") {
      const ids = [...new Set(aligned.cycle.map((source) => source.id))];
      return {
        ...aligned,
        message: `Conflicting same-rank relations: ${ids.join(", ")}`,
      };
    }
    const result = rerouteMovedEdges(graph, original, aligned.nodes, accepted);
    return inspectCandidate(
      withLanes(result, aligned.lanes),
      original,
      accepted,
      inspectRoutes,
    );
  });
}

function withLanes(result: LayoutResult, lanes: LayoutResult["lanes"]) {
  const changed = Object.entries(lanes).some(([id, box]) =>
    box.some((coordinate, axis) => coordinate !== result.lanes[id][axis]),
  );
  return changed ? { ...result, lanes } : result;
}

function inspectCandidate(
  result: LayoutResult,
  original: LayoutResult,
  constraints: Constraint[],
  inspectRoutes: InspectRoutes,
): AlignmentCandidate {
  const conflicts =
    result === original ? [] : [...new Set(inspectRoutes(result))];
  if (!conflicts.length) return { status: "determined", result };
  const hints = constraints.filter((c) => c.kind === "sameRank");
  return {
    status: "routing-failed",
    hints,
    conflicts,
    message: `Cannot route same-rank hints ${hints.map((h) => h.path).join(", ")}: arrows ${conflicts.join(", ")}`,
  };
}
