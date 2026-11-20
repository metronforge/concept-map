import type { LayoutProblem } from "../problem.js";
import type { LayoutResult } from "../types.js";
import type { DifferenceRelation, RelationSystem } from "./types.js";

// Source node ids cannot contain "$", so the fixed origin cannot collide.
const origin = "$rank-origin";

function forwardRelations(
  problem: LayoutProblem,
  boxes: LayoutResult["nodes"],
  axis: 0 | 1,
  rankGap: number,
): DifferenceRelation[] {
  const free = new Set(
    problem.constraints.flatMap((c) => (c.kind === "free" ? [c.edge] : [])),
  );
  return problem.edges
    .filter((e) => !free.has(e.id) && boxes[e.to][axis] > boxes[e.from][axis])
    .map((e) => ({
      id: `edges.${e.id}`,
      from: e.from,
      to: e.to,
      kind: "minimum",
      gap: rankGap,
      size: e.from,
    }));
}

function hintRelations(problem: LayoutProblem): DifferenceRelation[] {
  return problem.constraints.flatMap((hint, index) => {
    if (hint.kind !== "sameRank") return [];
    return hint.nodes.slice(1).map((node, i) => ({
      id: `${hint.path ?? `constraints[${index}]`}.nodes[${i + 1}]`,
      from: hint.nodes[0],
      to: node,
      kind: "equal" as const,
      gap: 0,
    }));
  });
}

/** Build rank bounds from validated engine boxes without changing geometry.
 * Only forward arrows preserve order; independent branches may align.
 * The caller supplies the engine's rank gap and checks the solver's witness.
 */
export function rankRelations(
  problem: LayoutProblem,
  boxes: LayoutResult["nodes"],
  rankGap: number,
): RelationSystem {
  const direction = problem.constraints.find((c) => c.kind === "direction");
  const axis = direction?.direction === "right" ? 0 : 1;
  return {
    variables: [
      { id: origin, size: 0 },
      ...problem.nodes.map(({ id }) => ({ id, size: boxes[id][axis + 2] })),
    ],
    anchors: [{ id: "rank-origin", variable: origin, position: 0 }],
    relations: [
      ...problem.nodes.map(({ id }): DifferenceRelation => ({
        id: `engine.${id}`,
        from: origin,
        to: id,
        kind: "minimum",
        gap: boxes[id][axis],
      })),
      ...forwardRelations(problem, boxes, axis, rankGap),
      ...hintRelations(problem),
    ],
  };
}
