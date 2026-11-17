import type { ResolvedMap } from "../schema.js";
import { wrappedLines } from "../model/labels.js";
import { escapeHtml } from "./inline.js";

/** Replaying a refined map keeps its measured line breaks and positions. */
export function renderArrowLabel(map: ResolvedMap, id: string): string {
  const label = map.edges[id].label!;
  const size = map.measurement?.labels[id];
  if (!size?.wrap) return escapeHtml(label.text);
  return wrappedLines(size, label.at)
    .map(
      (line) =>
        `<tspan x="${line.x}" y="${line.y}">${escapeHtml(line.text)}</tspan>`,
    )
    .join("");
}
