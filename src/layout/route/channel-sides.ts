import type { Constraint } from "../problem.js";
import type { LayoutBox } from "../types.js";

type Side = "top" | "right" | "bottom" | "left";

/** Choose facing sides, overridden by the arrow's stated side hints. */
export function channelSides(
  from: LayoutBox,
  to: LayoutBox,
  edge: string,
  constraints: readonly Constraint[],
): { from: Side; to: Side } {
  const dx = to[0] + to[2] / 2 - from[0] - from[2] / 2;
  const dy = to[1] + to[3] / 2 - from[1] - from[3] / 2;
  const sides: { from: Side; to: Side } =
    Math.abs(dx) >= Math.abs(dy)
      ? dx >= 0
        ? { from: "right", to: "left" }
        : { from: "left", to: "right" }
      : dy >= 0
        ? { from: "bottom", to: "top" }
        : { from: "top", to: "bottom" };
  const required = new Set<string>();
  for (const hint of constraints) {
    if (hint.kind !== "side" || hint.edge !== edge || required.has(hint.end))
      continue;
    sides[hint.end] = hint.side;
    if (hint.strength === "required") required.add(hint.end);
  }
  return sides;
}
