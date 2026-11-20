import type {
  DifferenceRelation,
  RelationEdge,
  RelationGraph,
  RelationSystem,
} from "./types.js";

/** Round each measurement upwards before composing a constraint. */
function ticks(value: number): number {
  const rounded = Math.ceil(value * 64);
  if (!Number.isSafeInteger(rounded))
    throw new RangeError("Relation measurements must fit the exact 1/64 grid");
  return rounded === 0 ? 0 : rounded;
}

function indexById(values: { id: string }[]): Map<string, number> {
  const indices = new Map<string, number>();
  for (const [i, value] of values.entries()) {
    if (indices.has(value.id))
      throw new Error(`Duplicate relation-system id: ${value.id}`);
    indices.set(value.id, i + 1);
  }
  return indices;
}

function vertex(indices: Map<string, number>, id: string): number {
  const found = indices.get(id);
  if (found === undefined) throw new Error(`Unknown relation variable: ${id}`);
  return found;
}

function reverse(edge: RelationEdge): RelationEdge {
  return {
    from: edge.to,
    to: edge.from,
    weight: edge.weight === 0 ? 0 : -edge.weight,
    source: { ...edge.source, reverse: true },
  };
}

function relationEdges(
  relation: DifferenceRelation,
  indices: Map<string, number>,
  sizes: number[],
): RelationEdge[] {
  const size =
    relation.size === undefined ? 0 : sizes[vertex(indices, relation.size) - 1];
  const edge: RelationEdge = {
    from: vertex(indices, relation.from),
    to: vertex(indices, relation.to),
    weight: ticks(relation.gap) + size,
    source: { kind: "relation", id: relation.id, reverse: false },
  };
  return relation.kind === "equal" ? [edge, reverse(edge)] : [edge];
}

function anchorEdges(
  anchor: RelationSystem["anchors"][number],
  indices: Map<string, number>,
): RelationEdge[] {
  const weight = anchor.position * 64;
  if (!Number.isSafeInteger(weight))
    throw new RangeError("Anchor positions must lie on the exact 1/64 grid");
  const edge: RelationEdge = {
    from: 0,
    to: vertex(indices, anchor.variable),
    weight: weight === 0 ? 0 : weight,
    source: { kind: "anchor", id: anchor.id, reverse: false },
  };
  return [edge, reverse(edge)];
}

function checkArithmetic(graph: RelationGraph): void {
  // Even V full in-place relaxation sweeps (including positive cycles)
  // must sum exactly. This also bounds simple paths and cycle witnesses.
  const additions = (graph.variables.length + 1) * graph.edges.length;
  const limit = Math.floor(Number.MAX_SAFE_INTEGER / additions);
  for (const edge of graph.edges) {
    if (!Number.isSafeInteger(edge.weight) || Math.abs(edge.weight) > limit)
      throw new RangeError("Relation path sums exceed the exact integer range");
  }
}

/** Pure input normalization, not a satisfiability or witness check. */
export function normalizeRelations(system: RelationSystem): RelationGraph {
  const indices = indexById(system.variables);
  indexById(system.anchors);
  indexById(system.relations);
  if (!system.anchors.length)
    throw new Error("At least one anchor is required");
  const sizes = system.variables.map(({ size }) => {
    if (size < 0) throw new RangeError("Variable sizes must be nonnegative");
    return ticks(size);
  });
  const edges = [
    ...system.anchors.flatMap((anchor) => anchorEdges(anchor, indices)),
    ...system.relations.flatMap((relation) =>
      relationEdges(relation, indices, sizes),
    ),
  ];
  const graph = {
    variables: system.variables.map(({ id }) => id),
    sizes,
    edges,
  };
  checkArithmetic(graph);
  return graph;
}
