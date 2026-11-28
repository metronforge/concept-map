import type { ResolvedMap } from "../../schema.js";
import type { LayoutBox, LayoutPoint, LabelSize } from "../types.js";
import { placeBadge } from "./badge-placement.js";

export function labelBox(
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
export function placeNumbers(
  map: ResolvedMap,
  fixed: ReadonlySet<string> = new Set(),
): ResolvedMap {
  const pinned = fixedNumberBoxes(map, fixed);
  const obstacles = numberObstacles(map).concat(pinned);
  const search = numberObstacles(map, true).concat(pinned);
  const badge = (at: LayoutPoint) => {
    const point = placeBadge(at, obstacles, map.viewBox, search);
    const box: LayoutBox = [point[0] - 8, point[1] - 8, 16, 16];
    obstacles.push(box);
    search.push(box);
    return point;
  };
  const result = JSON.parse(JSON.stringify(map)) as ResolvedMap;
  for (const [id, edge] of Object.entries(result.edges))
    if (edge.badge && !fixed.has(`step:${id}`)) edge.badge = badge(edge.badge);
  for (const [i, scenario] of result.scenarios.entries())
    for (const repeat of scenario.repeatBadges ?? [])
      if (!fixed.has(`repeat:${i}:${repeat.step}`))
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

function fixedNumberBoxes(map: ResolvedMap, fixed: ReadonlySet<string>) {
  const points = Object.entries(map.edges).flatMap(([id, edge]) =>
    edge.badge && fixed.has(`step:${id}`) ? [edge.badge] : [],
  );
  for (const [i, scenario] of map.scenarios.entries())
    for (const repeat of scenario.repeatBadges ?? [])
      if (fixed.has(`repeat:${i}:${repeat.step}`)) points.push(repeat.at);
  return points.map(([x, y]): LayoutBox => [x - 8, y - 8, 16, 16]);
}
