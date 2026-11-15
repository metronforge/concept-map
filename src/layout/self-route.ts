import type {
  LayoutBox,
  LayoutPoint,
  LayoutRoute,
  LabelSize,
} from "./types.js";
/** Dagre 3 returns a folded path for self-edges; use its reserved label lane. */
export function selfRoute(
  box: LayoutBox,
  center: LayoutPoint,
  label: LabelSize | undefined,
  right: boolean,
): LayoutRoute {
  const [x, y, w, h] = box;
  if (right) {
    const bottom = Math.max(
      y + h + 24,
      center[1] - (label?.height ?? 0) / 2 - 12,
    );
    return {
      points: [
        [x + w / 3, y + h],
        [x + w / 3, bottom],
        [x + (w * 2) / 3, bottom],
        [x + (w * 2) / 3, y + h],
      ],
      ...(label
        ? { label: [center[0], bottom + 12 + label.height / 2] as LayoutPoint }
        : {}),
    };
  }
  const side = Math.max(x + w + 24, center[0] - (label?.width ?? 0) / 2 - 12);
  return {
    points: [
      [x + w, y + h / 3],
      [side, y + h / 3],
      [side, y + (h * 2) / 3],
      [x + w, y + (h * 2) / 3],
    ],
    ...(label
      ? { label: [side + 12 + label.width / 2, center[1]] as LayoutPoint }
      : {}),
  };
}
