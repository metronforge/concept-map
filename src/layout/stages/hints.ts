import type { SourceMap, ResolvedMap } from "../../schema.js";
import { statedHints, constraintName } from "../hints.js";
import type { ConstraintVerdict } from "../problem.js";
import type { StatedHint } from "../types.js";
import { polylines } from "./paths.js";

function sideHolds(
  hint: Extract<StatedHint, { kind: "side" }>,
  source: SourceMap | ResolvedMap,
  resolved: ResolvedMap,
): boolean {
  const edge = source.edges[hint.edge];
  const box = edge && resolved.nodes[edge[hint.end]]?.box;
  const path = resolved.edges[hint.edge]?.path;
  if (!box || !path) return false;
  const lines = polylines(path, true);
  if (lines.length !== 1) return false;
  const point = hint.end === "from" ? lines[0][0] : lines[0].at(-1)!;
  const axis = hint.side === "left" || hint.side === "right" ? 0 : 1;
  const other = 1 - axis;
  const boundary =
    box[axis] +
    (hint.side === "right" || hint.side === "bottom" ? box[axis + 2] : 0);
  // Permit only floating-point roundoff, not a visible gap from the box.
  const epsilon = (a: number) =>
    Number.EPSILON *
    8 *
    Math.max(Math.abs(box[a]), box[a + 2], Math.abs(point[a]));
  return (
    Math.abs(point[axis] - boundary) <= epsilon(axis) &&
    point[other] >= box[other] - epsilon(other) &&
    point[other] <= box[other] + box[other + 2] + epsilon(other)
  );
}

/** Geometry is authoritative; rank exclusion cannot be inferred from it. */
export function checkHints(
  source: SourceMap | ResolvedMap,
  resolved: ResolvedMap,
): ConstraintVerdict[] {
  const axis = source.direction === "right" ? 0 : 1;
  return statedHints(source).map((hint): ConstraintVerdict => {
    if (hint.kind === "pin") {
      const box = resolved.nodes[hint.node]?.box;
      const distance = box
        ? Math.hypot(
            box[0] + box[2] / 2 - hint.at[0],
            box[1] + box[3] / 2 - hint.at[1],
          )
        : Infinity;
      const message = `${hint.path}: pin (${hint.node}): ${distance} units from box centre`;
      return hint.strength === "required"
        ? { ...hint, holds: distance <= 1e-6, message }
        : { ...hint, holds: null, message };
    }
    if (hint.kind === "free")
      return {
        ...hint,
        holds: null,
        message: `${constraintName(hint)}: not verifiable from the drawing`,
      };
    const positions =
      hint.kind === "sameRank"
        ? hint.nodes.map((id) => resolved.nodes[id]?.box[axis])
        : [];
    const holds =
      hint.kind === "side"
        ? sideHolds(hint, source, resolved)
        : positions.every((p) => p !== undefined && p === positions[0]);
    return {
      ...hint,
      holds,
      message: `${constraintName(hint)}: ${holds ? "honoured" : "not honoured"}`,
    };
  });
}
