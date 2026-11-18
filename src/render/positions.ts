import type { ResolvedMap } from "../schema.js";
type Box = ResolvedMap["nodes"][string]["box"];

/** Text anchors shared by initial rendering and in-place geometry updates. */
export function nodeText(node: ResolvedMap["nodes"][string]) {
  const [x, y, , h] = node.box;
  return {
    main: [x + 10, y + (node.tag ? 17 : h / 2 + 4.5)],
    tag: [x + 10, y + 32],
  };
}

export function laneGeometry(
  lane: ResolvedMap["lanes"][string],
  map: Pick<ResolvedMap, "direction" | "viewBox">,
) {
  return {
    box: [lane.x ?? 6, lane.y, lane.w ?? map.viewBox[0] - 12, lane.h],
    text: [map.direction === "right" ? (lane.x ?? 6) + 10 : 16, lane.y + 16],
  };
}

export function frameText([x, y, w]: Box) {
  return [x + w - 8, y + 16];
}

export function calloutPoint([x, y]: Box) {
  return [x + 4, y + 4];
}
