import type { RelationEdge, RelationGraph, RelationSource } from "./types.js";

/** Claims can contain extreme values: use integers even for their differences. */
export function exactTicks(value: number): bigint | undefined {
  if (typeof value !== "number") return undefined;
  const ticks = value * 64;
  return Number.isSafeInteger(ticks) ? BigInt(ticks) : undefined;
}

function sourceEdge(graph: RelationGraph, source: RelationSource) {
  return graph.edges.find(
    (edge) =>
      edge.source.kind === source.kind &&
      edge.source.id === source.id &&
      edge.source.reverse === source.reverse,
  );
}

/** Resolve only source identifiers; no weight or endpoint comes from a claim. */
function walk(graph: RelationGraph, sources: RelationSource[]) {
  if (!sources.length) return undefined;
  const edges: RelationEdge[] = [];
  for (const source of sources) {
    const edge = sourceEdge(graph, source);
    if (!edge || (edges.length && edges.at(-1)!.to !== edge.from))
      return undefined;
    edges.push(edge);
  }
  return edges;
}

export function checkChain(
  graph: RelationGraph,
  sources: RelationSource[],
  target: number,
  coordinates: bigint[],
): boolean {
  const edges = walk(graph, sources);
  if (!edges || edges[0].from !== 0 || edges.at(-1)!.to !== target)
    return false;
  return edges.every(
    (edge) =>
      coordinates[edge.to] - coordinates[edge.from] === BigInt(edge.weight),
  );
}

export function checkCycle(
  graph: RelationGraph,
  sources: RelationSource[],
  sum: number,
): boolean {
  const edges = walk(graph, sources);
  if (!edges || edges[0].from !== edges.at(-1)!.to) return false;
  const total = edges.reduce((value, edge) => value + BigInt(edge.weight), 0n);
  return total > 0n && total === exactTicks(sum);
}

export function satisfies(graph: RelationGraph, coordinates: bigint[]) {
  return graph.edges.every(
    (edge) =>
      coordinates[edge.to] - coordinates[edge.from] >= BigInt(edge.weight),
  );
}

export function checkShift(
  graph: RelationGraph,
  coordinates: bigint[],
  shift: { variables: string[]; delta: number },
): boolean {
  const delta = exactTicks(shift.delta);
  const indices = Array.from(
    shift.variables,
    (id) => graph.variables.indexOf(id) + 1,
  );
  const moving = new Set(indices);
  if (delta === undefined || delta >= 0n || !moving.size || moving.has(0))
    return false;
  if (moving.size !== indices.length) return false;
  // No incoming bound: the set can move down indefinitely, not just through
  // slack in a nonminimal placement of an otherwise determined system.
  if (graph.edges.some((edge) => moving.has(edge.to) && !moving.has(edge.from)))
    return false;
  return satisfies(
    graph,
    coordinates.map((value, i) => value + (moving.has(i) ? delta : 0n)),
  );
}
