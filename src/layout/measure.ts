import { sansRanges, monoAdvance } from "./font-metrics.js";
import type { LabelMeasurer } from "./types.js";
function sansAdvance(codePoint: number): number {
  for (const [start, widths] of sansRanges) {
    const width = widths[codePoint - start];
    if (width !== undefined) return width / 1000;
  }
  return 1;
}
/** Deterministic server fallback. Hosts can inject DOM or their own font metrics. */
export const measureLabel: LabelMeasurer = (text, style) => {
  const lines = text.split(/\r?\n/);
  const widths = lines.map((line) =>
    [...line].reduce((sum, ch) => {
      const advance = style.mono
        ? monoAdvance
        : sansAdvance(ch.codePointAt(0)!);
      return sum + advance * style.fontSize + (style.letterSpacing ?? 0);
    }, 0),
  );
  return {
    width: Math.max(0, ...widths),
    height: Math.max(1, lines.length) * style.fontSize * 1.2,
  };
};
