import type { LabelSize } from "../layout/types.js";

/** Measure paint outside the line box, including font-size-adjust and halos. */
export function paintPadding(
  label: SVGTextElement,
  size: LabelSize,
  lineHeight: number,
): number {
  const svg = label.ownerSVGElement!;
  const clone = label.cloneNode(true) as SVGTextElement;
  clone.setAttribute("x", "0");
  clone.setAttribute("y", "0");
  clone.style.visibility = "hidden";
  const lines = [...clone.querySelectorAll("tspan")];
  lines.forEach((line, i) => {
    line.setAttribute("x", "0");
    line.setAttribute("y", String((i - (lines.length - 1) / 2) * lineHeight));
  });
  svg.append(clone);
  try {
    const rect = clone.getBoundingClientRect();
    const matrix = svg.getScreenCTM()!.inverse();
    const a = new DOMPoint(rect.left, rect.top).matrixTransform(matrix);
    const b = new DOMPoint(rect.right, rect.bottom).matrixTransform(matrix);
    const halo =
      parseFloat(
        label.ownerDocument.defaultView!.getComputedStyle(label).strokeWidth,
      ) || 0;
    return Math.max(
      halo * Math.SQRT2,
      -a.x,
      -size.ascent! - a.y,
      b.x - size.width,
      b.y + size.ascent! - size.height,
    );
  } finally {
    clone.remove();
  }
}
