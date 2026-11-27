import type { LayoutBox, LayoutResult } from "../types.js";
import { checkRelations } from "./check.js";
import type { RelationSolution } from "./result.js";
import type { RelationSystem } from "./types.js";

export type AlignedBoxes =
  | { status: "determined"; nodes: LayoutResult["nodes"] }
  | Extract<RelationSolution, { status: "contradictory" }>;

function equalGroups(system: RelationSystem): string[][] {
  const groups = new Map(system.variables.map(({ id }) => [id, new Set([id])]));
  for (const r of system.relations) {
    if (r.kind !== "equal") continue;
    const from = groups.get(r.from)!;
    const to = groups.get(r.to)!;
    for (const id of to) {
      from.add(id);
      groups.set(id, from);
    }
  }
  return [...new Set(groups.values())].map((group) => [...group]);
}

function enginePositionHolds(
  system: RelationSystem,
  nodes: LayoutResult["nodes"],
  ids: string[],
  position: number,
  axis: 0 | 1,
): boolean {
  return system.relations.every((r) => {
    // Equalities are restored together, including overlapping hint groups.
    if (r.kind === "equal" || !ids.includes(r.to)) return true;
    if (!Object.hasOwn(nodes, r.from)) return true;
    const size = system.variables.find((v) => v.id === r.size)?.size ?? 0;
    // Engine arrows measure forward; lane padding is measured by subtraction.
    // Accept either exact reconstruction, without adding a tolerance band.
    const from = nodes[r.from][axis];
    return position >= from + size + r.gap || position - from - size >= r.gap;
  });
}

function restoreEnginePositions(
  system: RelationSystem,
  nodes: LayoutResult["nodes"],
  boxes: LayoutResult["nodes"],
  axis: 0 | 1,
): void {
  const groups = equalGroups(system)
    .filter(([id]) => Object.hasOwn(boxes, id))
    .filter(
      (ids) => !system.anchors.some((anchor) => ids.includes(anchor.variable)),
    )
    .sort(([a], [b]) => nodes[a][axis] - nodes[b][axis]);
  // Zero-gap bounds can tie in position order (a node at a lane start).
  // Each group restores at most once; repeat until no predecessor changes.
  for (let pass = 0; pass < groups.length; pass++) {
    let changed = false;
    for (const ids of groups) {
      const original = boxes[ids[0]][axis];
      if (!ids.every((id) => boxes[id][axis] === original)) continue;
      if (ids.every((id) => nodes[id][axis] === original)) continue;
      if (!enginePositionHolds(system, nodes, ids, original, axis)) continue;
      for (const id of ids) nodes[id][axis] = original;
      changed = true;
    }
    if (!changed) break;
  }
}

/** Apply only checked rank/cross proposals: zero equalities and positive gaps.
 * Increasing position order lets us restore unforced engine coordinates.
 * Restored coordinates retain the original measurements, not rounded minima;
 * every incoming geometric bound and group equality still holds.
 */
export function applyRelations(
  system: RelationSystem,
  solution: RelationSolution,
  boxes: LayoutResult["nodes"],
  axis: 0 | 1,
): AlignedBoxes {
  if (!checkRelations(system, solution))
    throw new Error("Internal alignment error: invalid relation witness");
  if (solution.status === "contradictory") return solution;
  if (solution.status === "underdetermined")
    throw new Error(
      `Internal alignment error: unexpected shift ${JSON.stringify(solution.shift)}`,
    );
  const nodes = Object.fromEntries(
    Object.entries(boxes).map(([id, box]) => [id, [...box] as LayoutBox]),
  );
  for (const p of solution.placements)
    if (Object.hasOwn(nodes, p.variable)) nodes[p.variable][axis] = p.position;
  restoreEnginePositions(system, nodes, boxes, axis);
  return { status: "determined", nodes };
}
