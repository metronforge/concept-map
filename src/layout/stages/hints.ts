import type { SourceMap, ResolvedMap } from "../../schema.js";
import { statedHints, constraintName } from "../hints.js";
import type { ConstraintVerdict } from "../problem.js";

/** Box coordinates are authoritative; supplied hint metadata is not evidence. */
export function checkHints(
  source: SourceMap | ResolvedMap,
  resolved: ResolvedMap,
): ConstraintVerdict[] {
  const axis = source.direction === "right" ? 0 : 1;
  return statedHints(source).map((hint) => {
    const positions = hint.nodes.map((id) => resolved.nodes[id]?.box[axis]);
    const holds = positions.every((p) => p !== undefined && p === positions[0]);
    return {
      ...hint,
      holds,
      message: `${constraintName(hint)}: ${holds ? "honoured" : "not honoured"}`,
    };
  });
}
