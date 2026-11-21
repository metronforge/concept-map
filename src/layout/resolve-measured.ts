import type { SourceMap } from "../schema.js";
import type { Measurer } from "./ports.js";
import type { LayoutGraph, LayoutResult } from "./types.js";
import { resolveGeometry } from "./resolve.js";

/** Preserve measured label boxes before annotation placement consumes them. */
export function resolveMeasured(
  source: SourceMap,
  graph: LayoutGraph,
  result: LayoutResult,
  measurer: Measurer,
) {
  const resolved = resolveGeometry(
    source,
    graph,
    result,
    measurer.measure.bind(measurer),
  );
  resolved.measurement = {
    name: measurer.name,
    labels: Object.fromEntries(
      graph.edges.flatMap((e) => {
        if (!e.label) return [];
        const { text, ...size } = e.label;
        return [[e.id, size]];
      }),
    ),
  };
  return resolved;
}
