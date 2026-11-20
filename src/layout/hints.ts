import type { SourceMap, ResolvedMap } from "../schema.js";
import type { Constraint } from "./problem.js";
import type { LayoutOptions, UnsupportedHint } from "./types.js";

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
  const ids =
    constraint.kind === "side"
      ? `${constraint.edge}, ${constraint.end}, ${constraint.side}`
      : "edge" in constraint
        ? constraint.edge
        : "nodes" in constraint
          ? constraint.nodes.join(", ")
          : "";
  return `${constraint.path}: ${constraint.kind} (${ids})`;
}

export function reportUnsupportedHints(
  constraints: readonly Constraint[],
  notify: LayoutOptions["onUnsupportedHints"],
): void {
  const hints = constraints.flatMap((c): UnsupportedHint[] => {
    if (c.origin !== "stated" || c.path === undefined) return [];
    const origin = {
      origin: "stated" as const,
      path: c.path,
      reason: "unsupported" as const,
    };
    if (c.kind === "sameRank")
      return [{ ...c, ...origin, nodes: [...c.nodes] }];
    return c.kind === "side" || c.kind === "free" ? [{ ...c, ...origin }] : [];
  });
  if (hints.length) notify?.(hints);
}
