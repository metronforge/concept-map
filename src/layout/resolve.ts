import type { SourceMap, ResolvedMap } from "../schema.js";
import { ResolvedMapSchema } from "../schema.js";
import type {
  LabelMeasurer,
  LayoutBox,
  LayoutGraph,
  LayoutResult,
  LayoutPoint,
} from "./types.js";
import { bounds, midpoint } from "./geometry.js";
import { badgePositions } from "./badges.js";
import { measured } from "./measured.js";
function frameBoxes(
  map: SourceMap,
  result: LayoutResult,
  measure: LabelMeasurer,
): Record<string, LayoutBox> {
  return Object.fromEntries(
    Object.entries(map.frames).map(([id, f]) => {
      const b = bounds(f.showWith.map((n) => result.nodes[n]));
      const label = measured(measure, f.label, {
        fontSize: 10.5,
        mono: true,
        letterSpacing: 0.63,
      });
      return [
        id,
        [
          b[0] - 12,
          b[1] - 28,
          Math.max(b[2] + 24, label.width + 24),
          b[3] + 40,
        ],
      ];
    }),
  );
}
function viewport(
  graph: LayoutGraph,
  result: LayoutResult,
  frames: Record<string, LayoutBox>,
  badges: Record<string, LayoutPoint>,
): LayoutBox {
  const boxes = [
    ...Object.values(result.nodes),
    ...Object.values(result.lanes),
    ...Object.values(frames),
    ...Object.values(badges).map(([x, y]): LayoutBox => [x - 8, y - 8, 16, 16]),
  ];
  for (const e of graph.edges) {
    const r = result.edges[e.id];
    boxes.push(...r.points.map(([x, y]): LayoutBox => [x, y, 0, 0]));
    if (e.label) {
      const p = r.label ?? midpoint(r.points);
      boxes.push([
        p[0] - e.label.width / 2,
        p[1] - e.label.height / 2,
        e.label.width,
        e.label.height,
      ]);
    }
  }
  return bounds(boxes);
}
function edgeGeometry(
  map: SourceMap,
  graph: LayoutGraph,
  result: LayoutResult,
  move: (p: LayoutPoint) => LayoutPoint,
  badges: Record<string, LayoutPoint>,
) {
  return Object.fromEntries(
    graph.edges.map((e) => {
      const source = map.edges[e.id],
        r = result.edges[e.id];
      const points = r.points.map(move),
        badge = move(badges[e.id]);
      const label = move(r.label ?? midpoint(r.points));
      return [
        e.id,
        {
          ...source,
          path: points
            .map(([x, y], i) => `${i ? "L" : "M"}${x},${y}`)
            .join(" "),
          badge,
          ...(e.label
            ? {
                label: {
                  text: source.label!,
                  at: labelBaseline(label, e.label),
                },
              }
            : {}),
        },
      ];
    }),
  );
}
function resolvedScenarios(map: SourceMap, badge: (id: string) => LayoutPoint) {
  return map.scenarios.map((s) => ({
    ...s,
    ...(s.repeatBadges
      ? {
          repeatBadges: s.repeatBadges.map((r) => ({
            ...r,
            at: badge(r.edge),
          })),
        }
      : {}),
  }));
}
export function resolveGeometry(
  map: SourceMap,
  graph: LayoutGraph,
  result: LayoutResult,
  measure: LabelMeasurer,
): ResolvedMap {
  const frames = frameBoxes(map, result, measure),
    badges = badgePositions(graph, result),
    b = viewport(graph, result, frames, badges);
  const move = ([x, y]: LayoutPoint): LayoutPoint => [
    x - b[0] + 16,
    y - b[1] + 16,
  ];
  const box = ([x, y, w, h]: LayoutBox): LayoutBox => [...move([x, y]), w, h];
  const edges = edgeGeometry(map, graph, result, move, badges);
  return ResolvedMapSchema.parse({
    ...map,
    viewBox: [b[2] + 32, b[3] + 32],
    nodes: Object.fromEntries(
      Object.entries(map.nodes).map(([id, n]) => [
        id,
        { ...n, box: box(result.nodes[id]) },
      ]),
    ),
    lanes: Object.fromEntries(
      Object.entries(map.lanes).map(([id, l]) => {
        const [x, y, w, h] = box(result.lanes[id]);
        return [id, { ...l, x, y, w, h }];
      }),
    ),
    frames: Object.fromEntries(
      Object.entries(map.frames).map(([id, f]) => [
        id,
        { ...f, box: box(frames[id]) },
      ]),
    ),
    edges,
    scenarios: resolvedScenarios(map, (id) => edges[id].badge),
  });
}

function labelBaseline(
  [x, y]: LayoutPoint,
  size: import("./types.js").LabelSize,
): LayoutPoint {
  return [
    x - size.width / 2 - (size.left ?? 0),
    y +
      (size.ascent === undefined
        ? size.height / 3
        : size.ascent - size.height / 2),
  ];
}
