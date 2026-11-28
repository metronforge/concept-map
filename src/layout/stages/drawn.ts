import type { ResolvedMap, SourceMap } from "../../schema.js";
import type { LabelMeasurer } from "../types.js";
import { measured } from "../measured.js";
import { polylines } from "./paths.js";
import type { Rect, Vec } from "./plane.js";

/** Arrow-label size used by layout and rendering. */
export const TEXT = 10.5;
/** Rendered step-number radius at that size. */
const STEP_RADIUS = 8;

/** What a resolved map draws, as plain shapes. */
export interface Drawn {
  nodes: { id: string; box: Rect }[];
  edges: { id: string; from: string; to: string; lines: Vec[][] }[];
  labels: { id: string; box: Rect; uncertainty: number }[];
  steps: { id: string; at: Vec }[];
  nodeSteps: { id: string; at: Vec }[];
  radius: number;
}

/** Shapes of a resolved map, with text measured at `size`. */
export function drawn(
  source: SourceMap | ResolvedMap,
  resolved: ResolvedMap,
  size: number,
  measure: LabelMeasurer,
): Drawn {
  sameStructure(source, resolved);
  const edges = Object.entries(resolved.edges);
  return {
    nodes: Object.entries(resolved.nodes).map(([id, n]) => ({
      id,
      box: n.box,
    })),
    edges: edges.map(([id, e]) => ({
      id,
      from: source.edges[id].from,
      to: source.edges[id].to,
      lines: polylines(e.path),
    })),
    labels: labels(resolved, size, measure),
    steps: steps(resolved),
    nodeSteps: nodeSteps(resolved, size),
    radius: (STEP_RADIUS / TEXT) * size,
  };
}

function labels(
  resolved: ResolvedMap,
  size: number,
  measure: LabelMeasurer,
): Drawn["labels"] {
  return Object.entries(resolved.edges).flatMap(([id, e]) => {
    if (!e.label?.text) return [];
    const m = measured(measure, e.label.text, {
      fontSize: size,
      mono: true,
      edge: id,
    });
    // Text is drawn from its left baseline; the baseline sits a third of the
    // line height below the centre.
    const [x, y] = e.label.at;
    return [
      {
        id,
        uncertainty: m.uncertainty ?? 0,
        box: [
          x + (m.left ?? 0),
          y - (m.ascent ?? (m.height * 5) / 6),
          m.width,
          m.height,
        ] as Rect,
      },
    ];
  });
}

/** Arrow numbers and the numbers of repeated passes. */
function steps(resolved: ResolvedMap): Drawn["steps"] {
  return [
    ...Object.entries(resolved.edges).flatMap(([id, e]) =>
      e.badge ? [{ id: `step:${id}`, at: e.badge }] : [],
    ),
    ...resolved.scenarios.flatMap((s, i) =>
      (s.repeatBadges ?? []).map((b) => ({
        id: `repeat:${i}:${b.step}`,
        at: b.at,
      })),
    ),
  ];
}

function sameStructure(source: SourceMap | ResolvedMap, resolved: ResolvedMap) {
  for (const field of ["nodes", "edges"] as const)
    if (
      Object.keys(source[field]).sort().join() !==
      Object.keys(resolved[field]).sort().join()
    )
      throw new Error(
        `check: the resolved map has different ${field} from the source map`,
      );
  for (const [id, e] of Object.entries(source.edges)) {
    const r = resolved.edges[id];
    if (r.from !== e.from || r.to !== e.to)
      throw new Error(
        `check: edge “${id}” connects different nodes in the resolved map`,
      );
  }
}

/** Node step numbers intentionally sit on their box, but must not cover labels. */
export function nodeSteps(map: ResolvedMap, size: number): Drawn["nodeSteps"] {
  const inset = (2 * size) / TEXT;
  return map.scenarios.flatMap((scenario, i) =>
    !scenario.display.nodeBadges
      ? []
      : scenario.steps.flatMap((step) => {
          if (step.edges.length || !step.current.length) return [];
          const [x, y, w] = map.nodes[step.current[0]].box;
          return [
            {
              id: `node-step:${i}:${step.id}`,
              at: [x + w - inset, y + inset] as Vec,
            },
          ];
        }),
  );
}
