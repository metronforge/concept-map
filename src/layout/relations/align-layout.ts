import type { LayoutProblem } from "../problem.js";
import type { LayoutResult } from "../types.js";
import { alignLaneRanks } from "./align-lanes.js";
import { applyRelations } from "./apply.js";
import { crossRelations } from "./cross.js";
import { solveRelations } from "./solve.js";

/** Grow only the trailing cross boundary, retaining the engine's padding.
 * Empty lanes retain their cross extents, even when rank order moves them.
 */
function widenLanes(
  problem: LayoutProblem,
  original: LayoutResult,
  nodes: LayoutResult["nodes"],
  lanes: LayoutResult["lanes"],
  cross: 0 | 1,
): LayoutResult["lanes"] {
  return Object.fromEntries(
    Object.entries(lanes).map(([id, box]) => {
      const members = problem.nodes.filter((n) => n.lane === id);
      const end = (b: number[]) => b[cross] + b[cross + 2];
      const before = members.map((n) => end(original.nodes[n.id]));
      const after = members.map((n) => end(nodes[n.id]));
      const growth = members.length
        ? Math.max(...after) - Math.max(...before)
        : 0;
      if (growth <= 0) return [id, box];
      const next = [...box] as typeof box;
      const padding = end(box) - Math.max(...before);
      // Round a grown extent outward on the relation grid, so subtraction
      // cannot put a fractional node just outside its containing lane.
      next[cross + 2] =
        Math.ceil((Math.max(...after) + padding - box[cross]) * 64) / 64;
      return [id, next];
    }),
  );
}

/** Apply both axes and containing lanes before the caller reroutes arrows. */
export function alignLayout(
  problem: LayoutProblem,
  original: LayoutResult,
  rankGap: number,
  nodeGap: number,
) {
  const ranked = alignLaneRanks(problem, original, rankGap);
  if (ranked.status === "contradictory") return ranked;
  if (
    !problem.constraints.some(
      (c) =>
        c.kind === "sameRank" ||
        (c.kind === "pin" && c.strength === "required"),
    )
  )
    return ranked;
  const direction = problem.constraints.find((c) => c.kind === "direction");
  const cross = direction?.direction === "right" ? 1 : 0;
  const system = crossRelations(problem, ranked.nodes, nodeGap);
  const aligned = applyRelations(
    system,
    solveRelations(system),
    ranked.nodes,
    cross,
  );
  if (aligned.status === "contradictory")
    throw new Error("Internal cross-axis separation contradiction");
  return {
    ...aligned,
    lanes: widenLanes(problem, original, aligned.nodes, ranked.lanes, cross),
  };
}
