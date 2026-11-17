import type { SourceMap } from "../schema.js";
import type {
  LabelMeasurer,
  LabelSize,
  LabelStyle,
  LayoutGraph,
  LayoutNode,
} from "./types.js";
import { measured } from "./measured.js";
function nodeSize(
  map: SourceMap,
  id: string,
  measure: LabelMeasurer,
): LayoutNode {
  const n = map.nodes[id];
  const labels = [
    n.label,
    ...map.scenarios.flatMap((s) =>
      s.nodeLabels?.[id] === undefined ? [] : [s.nodeLabels[id]],
    ),
  ];
  const sizes = labels.map((text) =>
    measured(measure, text, { fontSize: 12.5, mono: !!n.mono }),
  );
  const tag = measured(measure, n.tag ?? "", {
    fontSize: 10.5,
    mono: true,
    letterSpacing: 0.525,
  });
  return {
    id,
    ...(n.lane ? { lane: n.lane } : {}),
    width: Math.ceil(
      Math.max(60, ...sizes.map((s) => s.width + 24), tag.width + 24),
    ),
    height: Math.ceil(
      Math.max(
        n.tag ? 50 : 36,
        ...sizes.map((s) => s.height + (n.tag ? tag.height + 22 : 20)),
      ),
    ),
  };
}
export function layoutGraph(
  map: SourceMap,
  measure: LabelMeasurer,
): LayoutGraph {
  return {
    direction: map.direction ?? "down",
    nodes: Object.keys(map.nodes).map((id) => nodeSize(map, id, measure)),
    edges: Object.entries(map.edges).map(([id, e]) => ({
      id,
      from: e.from,
      to: e.to,
      ...(e.label === undefined
        ? {}
        : {
            label: {
              ...measured(measure, e.label, {
                fontSize: 10.5,
                mono: true,
                edge: id,
              }),
              text: e.label,
            },
          }),
    })),
    lanes: Object.entries(map.lanes).map(([id, l]) => ({
      id,
      label: measured(measure, l.label, {
        fontSize: 10.5,
        mono: true,
        letterSpacing: 0.63,
      }),
    })),
  };
}
