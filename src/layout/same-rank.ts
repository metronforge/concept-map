import type { Constraint, LayoutProblem } from "./problem.js";
import type { LayoutGraph, LayoutResult } from "./types.js";
import { alignLayout } from "./relations/align-layout.js";
import { rerouteMovedEdges } from "./moved-routes.js";
import { routeMoved } from "./route/channel-moved.js";
import { chooseRoute } from "./route/choose-route.js";
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
        hints: accepted.filter((c) => c.kind === "sameRank"),
        message: `Conflicting same-rank relations: ${ids.join(", ")}`,
      };
    }
    const chosen = routeAligned(
      graph,
      original,
      aligned.nodes,
      aligned.lanes,
      accepted,
      inspectRoutes,
    );
    return inspectCandidate(chosen.result, accepted, chosen.conflicts, graph);
  });
}

function routeAligned(
  graph: LayoutGraph,
  original: LayoutResult,
  nodes: LayoutResult["nodes"],
  lanes: LayoutResult["lanes"],
  constraints: Constraint[],
  inspect: InspectRoutes,
) {
  const stretch = () =>
    withLanes(rerouteMovedEdges(graph, original, nodes, constraints), lanes);
  const stretched = stretch();
  if (stretched === original) return { result: original, conflicts: [] };
  const pinned = new Set(
    constraints.flatMap((c) =>
      c.kind === "pin" && c.strength === "required" ? [c.node] : [],
    ),
  );
  const channel = routeMoved(
    graph,
    original,
    nodes,
    routeBounds(nodes),
    pinned,
  );
  const routed = channel ? withLanes(channel, lanes) : null;
  return chooseRoute(routed, () => stretched, inspect);
}

function routeBounds(nodes: LayoutResult["nodes"]): [number, number] {
  const boxes = Object.values(nodes);
  return [
    Math.max(...boxes.map((box) => box[0] + box[2])) + 20,
    Math.max(...boxes.map((box) => box[1] + box[3])) + 20,
  ];
}

function withLanes(result: LayoutResult, lanes: LayoutResult["lanes"]) {
  const changed = Object.entries(lanes).some(([id, box]) =>
    box.some((coordinate, axis) => coordinate !== result.lanes[id][axis]),
  );
  return changed ? { ...result, lanes } : result;
}

function inspectCandidate(
  result: LayoutResult,
  constraints: Constraint[],
  conflicts: readonly string[],
  graph: LayoutGraph,
): AlignmentCandidate {
  if (!conflicts.length) return { status: "determined", result };
  const hints = constraints.filter((c) => c.kind === "sameRank");
  const ends = new Set(
    graph.edges
      .filter((edge) => conflicts.includes(edge.id))
      .flatMap((edge) => [edge.from, edge.to]),
  );
  const pins = constraints.filter(
    (c) => c.kind === "pin" && c.strength === "required" && ends.has(c.node),
  );
  const paths = [...hints, ...pins].map((hint) => hint.path).join(", ");
  return {
    status: "routing-failed",
    hints,
    conflicts,
    message: `Cannot route hints ${paths}: arrows ${conflicts.join(", ")}`,
  };
}
