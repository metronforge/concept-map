import type { LabelMeasurer, LabelSize, LabelStyle } from "./types.js";

/** Reject unusable host measurements at the same boundary as engine geometry. */
export function measured(
  measure: LabelMeasurer,
  text: string,
  style: LabelStyle,
): LabelSize {
  const size = measure(text, style);
  if (
    !Number.isFinite(size.width) ||
    size.width < 0 ||
    !Number.isFinite(size.height) ||
    size.height <= 0 ||
    !validMetrics(size)
  )
    throw new Error(`Invalid label measurement for “${text}”`);
  return size;
}
function validMetrics(size: LabelSize): boolean {
  if (
    [size.left, size.ascent, size.padding, size.uncertainty].some(
      (n) => n !== undefined && !Number.isFinite(n),
    )
  )
    return false;
  if (size.padding !== undefined && size.padding < 0) return false;
  if (size.uncertainty !== undefined && size.uncertainty < 0) return false;
  const wrap = size.wrap;
  return (
    !wrap ||
    (Array.isArray(wrap.lines) &&
      wrap.lines.length > 0 &&
      wrap.lines.every((line) => typeof line === "string") &&
      Number.isFinite(wrap.lineHeight) &&
      wrap.lineHeight > 0)
  );
}
