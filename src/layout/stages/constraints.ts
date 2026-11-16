import type { SourceMap, ResolvedMap } from "../../schema.js";
import type { ConstraintVerdict } from "../problem.js";

type Box = readonly [number, number, number, number];
function laneBox(resolved: ResolvedMap, id: string): Box | undefined {
  const lane = resolved.lanes[id];
  return (
    lane && [lane.x ?? 6, lane.y, lane.w ?? resolved.viewBox[0] - 12, lane.h]
  );
}
function inside(box: Box, lane: Box): boolean {
  return (
    box[0] >= lane[0] &&
    box[1] >= lane[1] &&
    box[0] + box[2] <= lane[0] + lane[2] + 1e-6 &&
    box[1] + box[3] <= lane[1] + lane[3] + 1e-6
  );
}
/** Recompute every required rule from source intent and resolved geometry.
 * Direction is preferred: its existing reading report remains descriptive. */
export function checkConstraints(
  source: SourceMap | ResolvedMap,
  resolved: ResolvedMap,
): ConstraintVerdict[] {
  const ids = Object.keys(source.lanes);
  const messages: string[] = [];
  const axis = source.direction === "right" ? 0 : 1;
  for (const [id, node] of Object.entries(source.nodes)) {
    if (!node.lane) continue;
    const box = resolved.nodes[id]?.box;
    const lane = laneBox(resolved, node.lane);
    if (!box || !lane || !inside(box, lane))
      messages.push(`layout.nodes.${id}: outside lane “${node.lane}”`);
  }
  ids.forEach((id, i) => {
    const box = laneBox(resolved, id);
    if (!box) messages.push(`layout.lanes: missing id “${id}”`);
    if (!i || !box) return;
    const prev = laneBox(resolved, ids[i - 1]);
    if (prev && box[axis] < prev[axis] + prev[axis + 2])
      messages.push(`layout.lanes.${id}: lanes must be ordered and disjoint`);
  });
  return ids.length
    ? [
        {
          kind: "lanes",
          strength: "required",
          holds: !messages.length,
          message:
            messages.join("; ") ||
            "Lanes are ordered, disjoint and contain their nodes",
        },
      ]
    : [];
}
