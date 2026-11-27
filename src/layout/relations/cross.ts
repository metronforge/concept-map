import type { LayoutProblem } from "../problem.js";
import type { LayoutResult } from "../types.js";
import type { DifferenceRelation, RelationSystem } from "./types.js";
import { pinAnchors } from "./pin-anchors.js";

// Source node ids cannot contain "$", so the fixed origin cannot collide.
const origin = "$cross-origin";

function separationRelations(
  ids: string[],
  boxes: LayoutResult["nodes"],
  axis: 0 | 1,
  nodeGap: number,
): DifferenceRelation[] {
  // A total order keeps all separation bounds acyclic, including ties.
  const ordered = [...ids].sort(
    (a, b) => boxes[a][axis] - boxes[b][axis] || (a < b ? -1 : a > b ? 1 : 0),
  );
  const rank = 1 - axis;
  const relations: DifferenceRelation[] = [];
  for (const [i, from] of ordered.entries()) {
    const a = boxes[from];
    for (const to of ordered.slice(i + 1)) {
      const b = boxes[to];
      if (a[rank] >= b[rank] + b[rank + 2]) continue;
      if (b[rank] >= a[rank] + a[rank + 2]) continue;
      relations.push({
        id: `separate.${from}:${to}`,
        from,
        to,
        kind: "minimum",
        gap: nodeGap,
        size: from,
      });
    }
  }
  return relations;
}

/** Build cross bounds after rank alignment; boxes retain engine cross positions. */
export function crossRelations(
  problem: LayoutProblem,
  boxes: LayoutResult["nodes"],
  nodeGap: number,
): RelationSystem {
  const direction = problem.constraints.find((c) => c.kind === "direction");
  const axis = direction?.direction === "right" ? 1 : 0;
  const pins = pinAnchors(problem, boxes, axis);
  const pinned = new Set(pins.map((pin) => pin.variable));
  return {
    variables: [
      { id: origin, size: 0 },
      ...problem.nodes.map(({ id }) => ({ id, size: boxes[id][axis + 2] })),
    ],
    anchors: [{ id: "cross-origin", variable: origin, position: 0 }, ...pins],
    relations: [
      ...problem.nodes
        .filter(({ id }) => !pinned.has(id))
        .map(({ id }): DifferenceRelation => ({
          id: `engine.${id}`,
          from: origin,
          to: id,
          kind: "minimum",
          gap: boxes[id][axis],
        })),
      ...separationRelations(
        problem.nodes.map(({ id }) => id),
        boxes,
        axis,
        nodeGap,
      ),
    ],
  };
}
