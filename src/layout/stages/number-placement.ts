import type { ResolvedMap } from "../../schema.js";
import type { LayoutBox, LayoutPoint, LabelSize } from "../types.js";
import { placeBadge } from "./badge-placement.js";

function labelBox(
  at: LayoutPoint,
  size: LabelSize,
  padding: number,
): LayoutBox {
  return [
    at[0] + (size.left ?? 0) - padding,
    at[1] - (size.ascent ?? (size.height * 5) / 6) - padding,
    size.width + 2 * padding,
    size.height + 2 * padding,
  ];
}

/** One number-placement stage for engine output and measured hand drawings. */
export function placeNumbers(map: ResolvedMap): ResolvedMap {
  const obstacles = numberObstacles(map);
  const search = numberObstacles(map, true);
  const badge = (at: LayoutPoint) => {
    const point = placeBadge(at, obstacles, map.viewBox, search);
    const box: LayoutBox = [point[0] - 8, point[1] - 8, 16, 16];
    obstacles.push(box);
    search.push(box);
    return point;
  };
  const result = JSON.parse(JSON.stringify(map)) as ResolvedMap;
  for (const edge of Object.values(result.edges))
    if (edge.badge) edge.badge = badge(edge.badge);
  for (const scenario of result.scenarios)
    for (const repeat of scenario.repeatBadges ?? [])
      repeat.at = badge(repeat.at);
  return result;
}

function numberObstacles(map: ResolvedMap, rounded = false) {
  const boxes = Object.values(map.nodes).map((n) => n.box);
  for (const [id, edge] of Object.entries(map.edges)) {
    if (!edge.label?.text) continue;
    const size = map.measurement!.labels[id];
    const padding = size.padding ?? 0;
    boxes.push(
      labelBox(
        edge.label.at,
        size,
        rounded ? Math.max(4, Math.ceil(padding / 4) * 4) : padding,
      ),
    );
  }
  return boxes;
}
