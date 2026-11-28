import type { LayoutProblem } from "../problem.js";
import type { LayoutResult } from "../types.js";

interface LaneExtent {
  id: string;
  start: number;
  end: number;
}

function pinnedBoundaries(
  problem: LayoutProblem,
  original: LayoutResult,
  lane: LaneExtent,
  axis: 0 | 1,
  side: "start" | "end",
): number[] {
  return problem.constraints.flatMap((hint) => {
    if (hint.kind !== "pin" || hint.strength !== "required") return [];
    if (problem.nodes.find((node) => node.id === hint.node)?.lane !== lane.id)
      return [];
    const box = original.nodes[hint.node];
    return [
      side === "start"
        ? hint.position[axis] - box[axis + 2] / 2 - (box[axis] - lane.start)
        : hint.position[axis] +
          box[axis + 2] / 2 +
          (lane.end - box[axis] - box[axis + 2]),
    ];
  });
}

export function hasPinnedMember(
  problem: LayoutProblem,
  lane: LaneExtent,
): boolean {
  return problem.constraints.some(
    (hint) =>
      hint.kind === "pin" &&
      hint.strength === "required" &&
      problem.nodes.find((node) => node.id === hint.node)?.lane === lane.id,
  );
}

export function pinBounds(
  problem: LayoutProblem,
  original: LayoutResult,
  lane: LaneExtent,
  axis: 0 | 1,
): [number, number] {
  return ["start", "end"].map((side) =>
    Math.min(
      lane[side as "start" | "end"],
      ...pinnedBoundaries(
        problem,
        original,
        lane,
        axis,
        side as "start" | "end",
      ),
    ),
  ) as [number, number];
}
