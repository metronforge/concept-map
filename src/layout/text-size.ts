import { monoAdvance } from "./font-metrics.js";
import type { LabelMeasurer, LabelStyle, LabelSize } from "./types.js";

export function textSize(
  text: string,
  style: LabelStyle,
  advance: (codePoint: number) => number,
): LabelSize {
  const lines = text.split(/\r?\n/);
  const widths = lines.map((line) =>
    [...line].reduce(
      (sum, ch) =>
        sum +
        advance(ch.codePointAt(0)!) * style.fontSize +
        (style.letterSpacing ?? 0),
      0,
    ),
  );
  return {
    width: Math.max(0, ...widths),
    height: Math.max(1, lines.length) * style.fontSize * 1.2,
  };
}
/** Arrow-only fallback lets the browser omit the sans-serif table. */
export const measureMono: LabelMeasurer = (text, style) =>
  textSize(text, style, () => monoAdvance);
