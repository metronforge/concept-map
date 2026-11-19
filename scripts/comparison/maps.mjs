import { readFileSync } from "node:fs";
import { SourceMapSchema, ResolvedMapSchema } from "../../dist/schema.js";

/** Strip geometry only; strict source parsing catches newly added geometry fields. */
export function stripGeometry(resolved) {
  const map = structuredClone(resolved);
  delete map.viewBox;
  for (const node of Object.values(map.nodes)) delete node.box;
  for (const frame of Object.values(map.frames)) delete frame.box;
  for (const lane of Object.values(map.lanes))
    for (const key of ["x", "y", "w", "h"]) delete lane[key];
  for (const edge of Object.values(map.edges)) {
    delete edge.path;
    delete edge.badge;
    if (edge.label !== undefined) edge.label = edge.label.text;
  }
  for (const scenario of map.scenarios)
    for (const badge of scenario.repeatBadges ?? []) delete badge.at;
  return SourceMapSchema.parse(map);
}

export function comparisonCopy(original) {
  const map = ResolvedMapSchema.parse(original);
  if (map.id !== "2.1") return map;
  const edge = "timeout_outer";
  if (map.edges[edge]?.to !== "outer" || !map.frames.outer)
    throw new Error(
      "The documented 2-1 exception no longer matches the fixture",
    );
  delete map.edges[edge];
  for (const s of map.scenarios) {
    for (const step of s.steps)
      step.edges = step.edges.filter((id) => id !== edge);
    if (
      s.flow?.some((hop) => hop.edge === edge) ||
      s.repeatBadges?.some((b) => b.edge === edge)
    )
      throw new Error(
        "2-1 exception unexpectedly participates in flow or repeat badges",
      );
  }
  return map;
}

export function bookMaps() {
  return JSON.parse(readFileSync("test/fixtures/book-maps.json", "utf8")).map(
    ({ id, map }) => ({
      id,
      manual: comparisonCopy(map),
      note:
        id === "2-1"
          ? "Every variant omits only timeout_outer (timeout to the outer frame) and its step reference. Frame endpoints are not implemented yet. The original book fixture is unchanged."
          : "",
    }),
  );
}

export function exampleMaps() {
  return ["coffee", "door", "gcd", "side-hints"].map((id) => ({
    id,
    source: SourceMapSchema.parse(
      JSON.parse(readFileSync(`examples/${id}/map.json`, "utf8")),
    ),
    note:
      id === "side-hints"
        ? "ELK honours the stated box sides, including the Retry loop above Waiting. Dagre lists side hints as unsupported. Both ELK columns keep stated hints; plain disables only derived scenario intent."
        : "Current standalone example. No hand-drawn reference is available.",
  }));
}
