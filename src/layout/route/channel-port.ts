import type { LayoutBox, LayoutPoint } from "../types.js";

type Side = "top" | "right" | "bottom" | "left";

/** Make a terminal for an arrow omitted from engine placement. */
export function channelPort(id: string, box: LayoutBox, side: Side) {
  const [x, y, width, height] = box;
  const point: LayoutPoint = [
    side === "left" ? x : side === "right" ? x + width : x + width / 2,
    side === "top" ? y : side === "bottom" ? y + height : y + height / 2,
  ];
  return { id, kind: "node" as const, point, sides: [side] };
}
