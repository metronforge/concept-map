import type { LayoutProblem } from "../problem.js";
import type { LayoutResult } from "../types.js";
import type { RelationSystem } from "./types.js";

/** A pin names a box centre; the solver fixes its leading edge on each axis. */
export function pinAnchors(
  problem: LayoutProblem,
  boxes: LayoutResult["nodes"],
  axis: 0 | 1,
): RelationSystem["anchors"] {
  return problem.constraints.flatMap((hint, index) => {
    if (hint.kind !== "pin" || hint.strength !== "required") return [];
    return [
      {
        id: hint.path ?? `constraints[${index}]`,
        variable: hint.node,
        position: hint.position[axis] - boxes[hint.node][axis + 2] / 2,
      },
    ];
  });
}
