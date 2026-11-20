import fc from "fast-check";
import type {
  RelationGraph,
  RelationSystem,
} from "../../../src/layout/relations/types.js";

function rawSystems(count: number) {
  return fc.record({
    sizes: fc.array(fc.integer({ min: 0, max: 32 }), {
      minLength: count,
      maxLength: count,
    }),
    anchors: fc.array(
      fc.record({
        variable: fc.integer({ min: 0, max: count - 1 }),
        position: fc.integer({ min: -16, max: 16 }),
      }),
      { minLength: 1, maxLength: 3 },
    ),
    relations: fc.array(
      fc.record({
        from: fc.integer({ min: 0, max: count - 1 }),
        to: fc.integer({ min: 0, max: count - 1 }),
        kind: fc.constantFrom("minimum" as const, "equal" as const),
        gap: fc.integer({ min: -64, max: 32 }),
        size: fc.option(fc.integer({ min: 0, max: count - 1 }), {
          nil: undefined,
        }),
      }),
      { maxLength: 10 },
    ),
  });
}

export const systems = fc.integer({ min: 1, max: 5 }).chain((count) =>
  rawSystems(count).map(({ sizes, anchors, relations }): RelationSystem => ({
    variables: sizes.map((size, i) => ({ id: String(i), size: size / 1024 })),
    anchors: anchors.map((a, i) => ({
      id: `a${i}`,
      variable: String(a.variable),
      position: a.position / 64,
    })),
    relations: relations.map((r, i) => ({
      id: `r${i}`,
      from: String(r.from),
      to: String(r.to),
      kind: r.kind,
      gap: r.gap / 1024,
      ...(r.size === undefined ? {} : { size: String(r.size) }),
    })),
  })),
);

/** Exhaustive simple paths/cycles, independent of iterative relaxation. */
export function enumerate(graph: RelationGraph) {
  const fromOrigin = Array<number>(graph.variables.length + 1).fill(-Infinity);
  fromOrigin[0] = 0;
  let positiveCycle = false;
  function visit(
    start: number,
    vertex: number,
    sum: number,
    seen: Set<number>,
  ) {
    if (start === 0) fromOrigin[vertex] = Math.max(fromOrigin[vertex], sum);
    for (const edge of graph.edges.filter((e) => e.from === vertex)) {
      const next = sum + edge.weight;
      if (edge.to === start && next > 0) positiveCycle = true;
      if (!seen.has(edge.to))
        visit(start, edge.to, next, new Set([...seen, edge.to]));
    }
  }
  for (let start = 0; start < fromOrigin.length; start++) {
    visit(start, start, 0, new Set([start]));
  }
  return { positiveCycle, fromOrigin };
}

export function holds(
  system: RelationSystem,
  coordinates: Map<string, number>,
) {
  const sizes = new Map(
    system.variables.map((v) => [v.id, Math.ceil(v.size * 64)]),
  );
  return (
    system.anchors.every((a) => coordinates.get(a.variable) === a.position) &&
    system.relations.every((r) => {
      const actual = (coordinates.get(r.to)! - coordinates.get(r.from)!) * 64;
      const bound =
        Math.ceil(r.gap * 64) + (r.size === undefined ? 0 : sizes.get(r.size)!);
      return r.kind === "equal" ? actual === bound : actual >= bound;
    })
  );
}
