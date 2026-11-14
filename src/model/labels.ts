import type { Point } from "./path";
export const labelMinimum = (viewBoxWidth: number, renderedWidth: number) =>
  (10.55 * viewBoxWidth) / renderedWidth;
export function fitNodeLabels(
  [, y, , h]: number[],
  main: { y: number; height: number },
  tag: { y: number; height: number },
) {
  const baseline = { main: y + 17, tag: y + 32 };
  if (
    main.y >= y &&
    main.y + main.height <= tag.y &&
    tag.y + tag.height <= y + h
  )
    return baseline;
  const gap = Math.min(2, Math.max(0, h - main.height - tag.height));
  const top = y + (h - main.height - gap - tag.height) / 2;
  return {
    main: baseline.main + top - main.y,
    tag: baseline.tag + top + main.height + gap - tag.y,
  };
}
export function fitEdgeLabel(
  text: string,
  [x, y]: Point,
  viewBoxWidth: number,
  measuredWidth: number,
  fontSize: number,
): { text: string; x: number; y: number }[] | null {
  if (measuredWidth <= viewBoxWidth - x - 6 || !text.includes(" ")) return null;
  const words = text.split(" ");
  return words.map((word, index) => ({
    text: word + (index < words.length - 1 ? " " : ""),
    x,
    y: y + (index - (words.length - 1) / 2) * fontSize,
  }));
}
