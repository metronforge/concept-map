import { measureMono, textSize } from "./text-size.js";
import { sansRanges } from "./font-metrics.js";
import type { LabelMeasurer } from "./types.js";
function sansAdvance(codePoint: number): number {
  for (const [start, widths] of sansRanges) {
    const width = widths[codePoint - start];
    if (width !== undefined) return width / 1000;
  }
  return 1;
}
/** Deterministic server fallback. Hosts can inject DOM or their own font metrics. */
export const measureLabel: LabelMeasurer = (text, style) =>
  style.mono ? measureMono(text, style) : textSize(text, style, sansAdvance);

/** The deterministic server adapter. */
export const fontTableMeasurer: import("./ports.js").Measurer = {
  name: "font-table",
  measure: measureLabel,
};

/** Keep function-based host measurements working. */
export function asMeasurer(
  input: LabelMeasurer | import("./ports.js").Measurer = fontTableMeasurer,
): import("./ports.js").Measurer {
  return typeof input === "function"
    ? { name: input === measureLabel ? "font-table" : "custom", measure: input }
    : input;
}
