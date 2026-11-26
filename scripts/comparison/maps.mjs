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
  return [
    "coffee",
    "door",
    "gcd",
    "side-hints",
    "free",
    "free-plain",
    "same-rank",
    "same-rank-plain",
  ].map((id) => ({
    id,
    source: SourceMapSchema.parse(exampleSource(id)),
    note: id.startsWith("free")
      ? id === "free"
        ? "Review feedback returns to the plan without influencing ranks. Both engines keep the plan above review. The next section removes only the free hint."
        : "The same source with only the free hint removed. Without derived intent, both engines put review above the plan and push building down."
      : id.startsWith("same-rank")
        ? id === "same-rank"
          ? "Quick and Finish are parallel outcomes. A required sameRank hint aligns them in both engines. Compare the next section, which removes only that hint. Plain columns disable scenario intent, not stated hints."
          : "The same source with only the sameRank hint removed. Both engines place Quick before Finish because its path is shorter. Compare the aligned outcomes in the preceding section."
        : id === "side-hints"
          ? "ELK honours the stated box sides, including the Retry loop above Waiting. Dagre lists side hints as unsupported. Both ELK columns keep stated hints; plain disables only derived scenario intent."
          : "Current standalone example. No hand-drawn reference is available.",
  }));
}

function exampleSource(id) {
  const name = id.endsWith("-plain") ? id.slice(0, -6) : id;
  const source = JSON.parse(readFileSync(`examples/${name}/map.json`, "utf8"));
  if (id.endsWith("-plain")) delete source.layout;
  return source;
}
