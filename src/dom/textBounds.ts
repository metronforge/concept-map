import type { LabelSize } from "../layout/types.js";

/** Measure glyph ink, not browser-specific SVG glyph-cell bounding boxes. */
export function paintPadding(
  label: SVGTextElement,
  size: LabelSize,
  lineHeight: number,
): number {
  const css = label.ownerDocument.defaultView!.getComputedStyle(label);
  const context = label.ownerDocument.createElement("canvas").getContext("2d")!;
  Object.assign(context, {
    font: css.font,
    fontKerning: css.fontKerning,
    fontStretch: css.fontStretch,
    fontVariantCaps: css.fontVariantCaps,
    letterSpacing: css.letterSpacing,
    wordSpacing: css.wordSpacing,
    direction: css.direction,
    textRendering: css.textRendering,
  });
  const lines = size.wrap?.lines ?? [label.textContent ?? ""];
  const halo =
    css.stroke === "none" ? 0 : (parseFloat(css.strokeWidth) || 0) / 2;
  return (
    halo +
    Math.max(
      0,
      ...lines.map((line, i) => {
        const ink = context.measureText(line);
        const y = (i - (lines.length - 1) / 2) * lineHeight;
        return Math.max(
          ink.actualBoundingBoxLeft,
          ink.actualBoundingBoxRight - size.width,
          ink.actualBoundingBoxAscent - y - size.ascent!,
          y + ink.actualBoundingBoxDescent + size.ascent! - size.height,
        );
      }),
    )
  );
}
