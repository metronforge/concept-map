import type { LayoutProblem } from "../problem.js";
import type { LayoutResult } from "../types.js";
import { rankRelations } from "./rank.js";
import type { DifferenceRelation, RelationSystem } from "./types.js";

interface LaneExtent {
  id: string;
  start: number;
  end: number;
}

function minimum(
  id: string,
  from: string,
  to: string,
  gap: number,
  size?: string,
): DifferenceRelation {
  return { id, from, to, kind: "minimum", gap, ...(size ? { size } : {}) };
}

function laneBounds(
  lane: LaneExtent,
  origin: string,
  startFloor: number,
  previous?: LaneExtent,
): DifferenceRelation[] {
  const start = `$lane.${lane.id}.start`,
    end = `$lane.${lane.id}.end`;
  return [
    minimum(`lanes.${lane.id}.start`, origin, start, startFloor),
    minimum(`lanes.${lane.id}.end`, origin, end, lane.end),
    minimum(`lanes.${lane.id}.size`, start, end, lane.end - lane.start),
    ...(previous
      ? [
          minimum(
            `lanes.${lane.id}.order`,
            `$lane.${previous.id}.end`,
            start,
            lane.start - previous.end,
          ),
        ]
      : []),
  ];
}

function containment(
  lane: LaneExtent,
  members: LayoutProblem["nodes"],
  original: LayoutResult,
  axis: 0 | 1,
): DifferenceRelation[] {
  if (!members.length) return [];
  // Retain the engine's header and trailing space, allowing slack inside.
  const leading = Math.min(
    ...members.map((n) => original.nodes[n.id][axis] - lane.start),
  );
  const trailing = Math.min(
    ...members.map(
      (n) =>
        lane.end - original.nodes[n.id][axis] - original.nodes[n.id][axis + 2],
    ),
  );
  return members.flatMap(({ id }) => [
    minimum(
      `lanes.${lane.id}.nodes.${id}.start`,
      `$lane.${lane.id}.start`,
      id,
      leading,
    ),
    minimum(
      `lanes.${lane.id}.nodes.${id}.end`,
      id,
      `$lane.${lane.id}.end`,
      trailing,
      id,
    ),
  ]);
}

function afterLanes(
  problem: LayoutProblem,
  original: LayoutResult,
  last: LaneExtent | undefined,
  axis: 0 | 1,
): DifferenceRelation[] {
  const unassigned = problem.nodes.filter((n) => n.lane === undefined);
  if (!last || !unassigned.length) return [];
  const gap = Math.min(
    ...unassigned.map((n) => original.nodes[n.id][axis] - last.end),
  );
  return unassigned.map(({ id }) =>
    minimum(`lanes.${last.id}.after.${id}`, `$lane.${last.id}.end`, id, gap),
  );
}

function addLanes(
  system: RelationSystem,
  problem: LayoutProblem,
  original: LayoutResult,
  axis: 0 | 1,
): void {
  const lanes = problem.groups.map(({ id }) => ({
    id,
    start: original.lanes[id][axis],
    end: original.lanes[id][axis] + original.lanes[id][axis + 2],
  }));
  for (const [i, lane] of lanes.entries()) {
    const start = `$lane.${lane.id}.start`,
      end = `$lane.${lane.id}.end`;
    system.variables.push({ id: start, size: 0 }, { id: end, size: 0 });
    const pinnedStarts = problem.constraints.flatMap((hint) => {
      if (hint.kind !== "pin" || hint.strength !== "required") return [];
      if (problem.nodes.find((node) => node.id === hint.node)?.lane !== lane.id)
        return [];
      const box = original.nodes[hint.node];
      const position = hint.position[axis] - box[axis + 2] / 2;
      return [position - (box[axis] - lane.start)];
    });
    const startFloor = Math.min(lane.start, ...pinnedStarts);
    system.relations.push(
      ...laneBounds(lane, system.anchors[0].variable, startFloor, lanes[i - 1]),
    );
    system.relations.push(
      ...containment(
        lane,
        problem.nodes.filter((n) => n.lane === lane.id),
        original,
        axis,
      ),
    );
  }
  system.relations.push(...afterLanes(problem, original, lanes.at(-1), axis));
}

/** Extend rank relations with ordered, expandable lanes. Lane boundary ids use
 * "$", which source ids cannot contain. All input geometry is left unchanged.
 * Common engine padding and inter-lane gaps are minimums, not fixed offsets.
 * The caller must check the witness and apply both node and lane coordinates.
 */
export function laneRankRelations(
  problem: LayoutProblem,
  original: LayoutResult,
  rankGap: number,
): RelationSystem {
  const system = rankRelations(problem, original.nodes, rankGap);
  const direction = problem.constraints.find((c) => c.kind === "direction");
  addLanes(system, problem, original, direction?.direction === "right" ? 0 : 1);
  return system;
}
