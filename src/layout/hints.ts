import type { SourceMap, ResolvedMap } from "../schema.js";
import type { Constraint } from "./problem.js";
import type { LayoutOptions } from "./types.js";

export function statedHints(map: SourceMap | ResolvedMap) {
  return (map.layout?.hints ?? []).map((hint, i) => ({
    ...hint,
    origin: "stated" as const,
    path: `layout.hints[${i}]`,
  }));
}

/** Name source hints in capability refusals without losing their references. */
export function constraintName(constraint: Constraint): string {
  if (!constraint.path) return constraint.kind;
  const ids = "nodes" in constraint ? constraint.nodes.join(", ") : "";
  return `${constraint.path}: ${constraint.kind} (${ids})`;
}

export function reportUnsupportedHints(
  constraints: readonly Constraint[],
  notify: LayoutOptions["onUnsupportedHints"],
): void {
  const hints = constraints.flatMap((c) =>
    c.kind === "sameRank" && c.origin === "stated" && c.path !== undefined
      ? [{ ...c, origin: "stated" as const, path: c.path, nodes: [...c.nodes] }]
      : [],
  );
  if (hints.length) notify?.(hints);
}
