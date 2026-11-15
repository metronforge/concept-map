import { SourceMapSchema, ResolvedMapSchema } from "../schema.js";
import { LayoutResultSchema } from "../schema/layout.js";
import type { SourceMap, ResolvedMap } from "../schema.js";
import type { LayoutGraph, LayoutResult } from "./types.js";
function path(parts: PropertyKey[]): string {
  return parts
    .map((p, i) =>
      typeof p === "number" ? `[${p}]` : `${i ? "." : ""}${String(p)}`,
    )
    .join("");
}
export function parseMap(input: unknown): SourceMap | ResolvedMap {
  const resolved =
    typeof input === "object" && input !== null && "viewBox" in input;
  const result = resolved
    ? ResolvedMapSchema.safeParse(input)
    : SourceMapSchema.safeParse(input);
  if (!result.success)
    throw new Error(
      result.error.issues
        .map((i) => `${path(i.path) || "map"}: ${i.message}`)
        .join("\n"),
    );
  return result.data;
}
function keys(actual: object, ids: string[], field: string) {
  const expected = new Set(ids);
  for (const id of ids)
    if (!Object.hasOwn(actual, id))
      throw new Error(`layout.${field}: missing id “${id}”`);
  for (const id of Object.keys(actual))
    if (!expected.has(id))
      throw new Error(`layout.${field}: unknown id “${id}”`);
}
export function checkedResult(
  input: unknown,
  graph: LayoutGraph,
): LayoutResult {
  const parsed = LayoutResultSchema.safeParse(input);
  if (!parsed.success)
    throw new Error(
      parsed.error.issues
        .map((i) => `layout.${path(i.path)}: ${i.message}`)
        .join("\n"),
    );
  const result = parsed.data;
  for (const field of ["nodes", "edges", "lanes"] as const)
    keys(
      result[field],
      graph[field].map((item) => item.id),
      field,
    );
  for (const n of graph.nodes) {
    const b = result.nodes[n.id];
    if (b[2] + 1e-6 < n.width || b[3] + 1e-6 < n.height)
      throw new Error(`layout.nodes.${n.id}: box smaller than measured label`);
    if (n.lane) {
      const l = result.lanes[n.lane];
      if (
        b[0] < l[0] ||
        b[1] < l[1] ||
        b[0] + b[2] > l[0] + l[2] + 1e-6 ||
        b[1] + b[3] > l[1] + l[3] + 1e-6
      )
        throw new Error(`layout.nodes.${n.id}: outside lane “${n.lane}”`);
    }
  }
  checkLanes(graph, result);
  return result;
}

function checkLanes(graph: LayoutGraph, result: LayoutResult): void {
  graph.lanes.slice(1).forEach((l, i) => {
    const prev = result.lanes[graph.lanes[i].id];
    if (result.lanes[l.id][1] < prev[1] + prev[3])
      throw new Error(
        `layout.lanes.${l.id}: lanes must be ordered and disjoint`,
      );
  });
}
