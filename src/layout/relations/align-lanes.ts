import type { LayoutProblem } from "../problem.js";
import type { LayoutBox, LayoutResult } from "../types.js";
import { applyRelations } from "./apply.js";
import { laneRankRelations } from "./lane-rank.js";
import { solveRelations } from "./solve.js";
import type { RelationSystem } from "./types.js";

/** Prefer a lane-path witness when lane order itself forbids the hint.
 * applyRelations checks the selected witness against the complete system.
 */
function solveLaneRanks(system: RelationSystem) {
  const solution = solveRelations(system);
  if (solution.status !== "contradictory") return solution;
  const lanes = solveRelations({
    ...system,
    relations: system.relations.filter((r) => !r.id.startsWith("edges.")),
  });
  return lanes.status === "contradictory" ? lanes : solution;
}

function boundaryBoxes(original: LayoutResult, axis: 0 | 1) {
  const boxes = { ...original.nodes };
  for (const [id, box] of Object.entries(original.lanes)) {
    const start: LayoutBox = [0, 0, 0, 0];
    start[axis] = box[axis];
    const end: LayoutBox = [...start];
    end[axis] += box[axis + 2];
    boxes[`$lane.${id}.start`] = start;
    boxes[`$lane.${id}.end`] = end;
  }
  return boxes;
}

function laneBoxes(
  original: LayoutResult,
  aligned: LayoutResult["nodes"],
  axis: 0 | 1,
): LayoutResult["lanes"] {
  return Object.fromEntries(
    Object.entries(original.lanes).map(([id, box]) => {
      const start = aligned[`$lane.${id}.start`][axis];
      const end = aligned[`$lane.${id}.end`][axis];
      const next: LayoutBox = [...box];
      next[axis] = start;
      // Avoid subtracting unchanged fractional boundaries to recover a size.
      if (start !== box[axis] || end !== box[axis] + box[axis + 2])
        next[axis + 2] = end - start;
      return [id, next];
    }),
  );
}

/** Apply rank alignment to nodes and lane boundaries together. Cross-axis
 * separation, lane widening and rerouting remain the caller's next stages.
 */
export function alignLaneRanks(
  problem: LayoutProblem,
  original: LayoutResult,
  rankGap: number,
) {
  if (
    !problem.constraints.some(
      (c) =>
        c.kind === "sameRank" ||
        (c.kind === "pin" && c.strength === "required"),
    )
  )
    return {
      status: "determined" as const,
      nodes: original.nodes,
      lanes: original.lanes,
    };
  const direction = problem.constraints.find((c) => c.kind === "direction");
  const axis = direction?.direction === "right" ? 0 : 1;
  const system = laneRankRelations(problem, original, rankGap);
  const aligned = applyRelations(
    system,
    solveLaneRanks(system),
    boundaryBoxes(original, axis),
    axis,
  );
  if (aligned.status === "contradictory") return aligned;
  return {
    status: "determined" as const,
    nodes: Object.fromEntries(
      Object.keys(original.nodes).map((id) => [id, aligned.nodes[id]]),
    ),
    lanes: laneBoxes(original, aligned.nodes, axis),
  };
}
