import type { ResolvedMap } from "../../schema.js";
import type { Measurer } from "../ports.js";
import type { LabelSize, LayoutPoint } from "../types.js";
import { measureMono } from "../text-size.js";
import { measured } from "../graph.js";
import { placeBadge, type BadgeObstacle } from "./badge-placement.js";
const style = { fontSize: 10.5, mono: true };

function labels(map: ResolvedMap, measurer: Measurer) {
  const sizes: Record<string, LabelSize> = {};
  const obstacles: BadgeObstacle[] = [];
  const search: BadgeObstacle[] = [];
  const edges = Object.fromEntries(
    Object.entries(map.edges).map(([id, edge]) => {
      if (!edge.label) return [id, edge];
      const previous =
        map.measurement?.labels[id] ?? measureMono(edge.label.text, style);
      const size = measured(measurer.measure.bind(measurer), edge.label.text, {
        ...style,
        edge: id,
      });
      const [x, y] = edge.label.at;
      const at: LayoutPoint = [
        x +
          ((previous.left ?? 0) - (size.left ?? 0)) +
          (previous.width - size.width) / 2,
        y +
          ((size.ascent ?? (size.height * 5) / 6) -
            (previous.ascent ?? (previous.height * 5) / 6)) +
          (previous.height - size.height) / 2,
      ];
      sizes[id] = size;
      if (edge.label.text) {
        obstacles.push(labelObstacle(at, size));
        search.push(
          labelObstacle(at, size, Math.ceil((size.padding ?? 0) / 4) * 4),
        );
      }
      return [id, { ...edge, label: { ...edge.label, at } }];
    }),
  );
  return { sizes, obstacles, search, edges };
}

/** Re-measure text and move covered step numbers, keeping all fixed geometry.
 * Old maps without measurements use font-table sizes to recover label centres.
 * No input is mutated; the checker measures independently of this metadata. */
export function refine(map: ResolvedMap, measurer: Measurer): ResolvedMap {
  const text = labels(map, measurer);
  const nodes = Object.values(map.nodes).map(
    ({ box: [x, y, width, height] }) => ({ x, y, width, height }),
  );
  const bounds = { x: 0, y: 0, width: map.viewBox[0], height: map.viewBox[1] };
  const badge = (at: LayoutPoint) =>
    placeBadge(at, 8, text.obstacles, bounds, nodes, text.search);
  return {
    ...map,
    measurement: { name: measurer.name, labels: text.sizes },
    edges: Object.fromEntries(
      Object.entries(text.edges).map(([id, e]) => [
        id,
        { ...e, ...(e.badge ? { badge: badge(e.badge) } : {}) },
      ]),
    ),
    scenarios: map.scenarios.map((s) => ({
      ...s,
      ...(s.repeatBadges
        ? {
            repeatBadges: s.repeatBadges.map((b) => ({
              ...b,
              at: badge(b.at),
            })),
          }
        : {}),
    })),
  };
}

function labelObstacle(
  at: LayoutPoint,
  size: LabelSize,
  padding = size.padding ?? 0,
): BadgeObstacle {
  return {
    x: at[0] + (size.left ?? 0) - padding,
    y: at[1] - (size.ascent ?? (size.height * 5) / 6) - padding,
    width: size.width + 2 * padding,
    height: size.height + 2 * padding,
  };
}
