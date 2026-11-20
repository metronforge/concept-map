import type { LayoutProblem } from "../problem.js";
import type { LayoutResult } from "../types.js";
import { applyRelations } from "./apply.js";
import type { AlignedBoxes } from "./apply.js";
import { crossRelations } from "./cross.js";
import { rankRelations } from "./rank.js";
import { solveRelations } from "./solve.js";

/** Align boxes only. The caller must reroute moved endpoints before resolving
 * geometry, and handle any checked rank contradiction according to strength.
 */
export function alignBoxes(
  problem: LayoutProblem,
  boxes: LayoutResult["nodes"],
  rankGap: number,
  nodeGap: number,
): AlignedBoxes {
  if (!problem.constraints.some((c) => c.kind === "sameRank"))
    return { status: "determined", nodes: boxes };
  const direction = problem.constraints.find((c) => c.kind === "direction");
  const axis = direction?.direction === "right" ? 0 : 1;
  const rank = rankRelations(problem, boxes, rankGap);
  const aligned = applyRelations(rank, solveRelations(rank), boxes, axis);
  if (aligned.status === "contradictory") return aligned;
  const cross = crossRelations(problem, aligned.nodes, nodeGap);
  return applyRelations(
    cross,
    solveRelations(cross),
    aligned.nodes,
    axis === 0 ? 1 : 0,
  );
}
