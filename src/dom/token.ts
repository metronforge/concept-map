import type { Segment } from "../model/flow.js";
import type { ResolvedMap } from "../schema.js";

export function clearTokenStyles(tokens: SVGCircleElement[]) {
  for (const token of tokens) {
    token.style.offsetPath = "";
    token.style.offsetDistance = "";
    token.style.offsetRotate = "";
    token.style.offsetAnchor = "";
    token.style.offsetPosition = "";
    token.style.transform = "";
  }
}

export function placeTokens(tokens: SVGCircleElement[], [x, y]: number[]) {
  for (const token of tokens) {
    token.setAttribute("cx", String(x));
    token.setAttribute("cy", String(y));
    token.setAttribute("visibility", "visible");
  }
}

/** Also used to update an active animation without replacing its clock. */
export function tokenFrames(
  tokens: SVGCircleElement[],
  segment: Segment,
  edges: ResolvedMap["edges"],
): Keyframe[] {
  placeTokens(tokens, segment.type === "pause" ? segment.at : [0, 0]);
  if (segment.type === "travel") {
    for (const token of tokens) {
      token.style.offsetPath = `path("${edges[segment.edge].path}")`;
      token.style.offsetRotate = "0deg";
      token.style.offsetAnchor = "0px 0px";
      token.style.offsetPosition = "0px 0px";
    }
    return [
      { offsetDistance: segment.reverse ? "100%" : "0%" },
      { offsetDistance: segment.reverse ? "0%" : "100%" },
    ];
  }
  const points =
    segment.type === "pause"
      ? [
          [0, 0],
          [0, 0],
        ]
      : [segment.from, segment.to];
  return points.map(([x, y]) => ({ transform: `translate(${x}px, ${y}px)` }));
}
