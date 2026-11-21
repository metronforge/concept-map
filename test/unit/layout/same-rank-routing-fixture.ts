import { SourceMapSchema } from "../../../src/schema.js";
import type { Constraint, LayoutProblem } from "../../../src/layout/problem.js";
import type { LayoutResult } from "../../../src/layout/types.js";
import { problemGraph } from "../../../src/layout/build-problem.js";
import { measureLabel } from "../../../src/layout/measure.js";
import { resolveGeometry } from "../../../src/layout/resolve.js";
import { placeAnnotations } from "../../../src/layout/stages/placement.js";
import { newRoutingDefects } from "../../../src/layout/routing-defects.js";

export function hint(
  nodes: string[],
  strength: "preferred" | "required" = "preferred",
  index = 0,
): Extract<Constraint, { kind: "sameRank" }> {
  return {
    kind: "sameRank",
    nodes,
    strength,
    origin: "stated",
    path: `layout.hints[${index}]`,
  };
}

function placement(down: boolean, shift: number) {
  const original: LayoutResult = {
    nodes: {
      a: [0, 0, 60, 36],
      b: [300, 120, 60, 36],
      c: [shift, 300, 60, 36],
      s: [0, 500, 60, 36],
      t: [400, 700, 60, 36],
    },
    lanes: {},
    edges: {
      ab: {
        points: [
          [60, 18],
          [80, 18],
          [80, 138],
          [300, 138],
        ],
      },
    },
  };
  if (down) {
    for (const [id, [x, y, w, h]] of Object.entries(original.nodes))
      original.nodes[id] = [y, x, h, w];
    original.edges.ab.points = original.edges.ab.points.map(([x, y]) => [y, x]);
  }
  return original;
}

export function routingFixture(hints: Constraint[], down = false, shift = 40) {
  const original = placement(down, shift);
  const problem: LayoutProblem = {
    nodes: Object.entries(original.nodes).map(([id, b]) => ({
      id,
      width: b[2],
      height: b[3],
    })),
    edges: [{ id: "ab", from: "a", to: "b" }],
    groups: [],
    constraints: [
      {
        kind: "direction",
        strength: "preferred",
        direction: down ? "down" : "right",
      },
      ...hints,
    ],
  };
  const graph = problemGraph(problem);
  const source = sourceFor(problem);
  const resolve = (result: LayoutResult) =>
    placeAnnotations(resolveGeometry(source, graph, result, measureLabel));
  const before = resolve(original);
  const inspect = (result: LayoutResult) =>
    conflictEdges(newRoutingDefects(source, before, resolve(result)));
  return { problem, graph, original, source, resolve, before, inspect };
}

function sourceFor(problem: LayoutProblem) {
  return SourceMapSchema.parse({
    format: 3,
    id: "routing-refusal",
    title: "Routing refusal",
    direction:
      problem.constraints[0].kind === "direction"
        ? problem.constraints[0].direction
        : "down",
    layers: { work: { label: "Work" } },
    nodes: Object.fromEntries(
      problem.nodes.map(({ id }) => [id, { label: id, layer: "work" }]),
    ),
    edges: { ab: { from: "a", to: "b" } },
    scenarios: [
      {
        id: "all",
        label: "All",
        steps: [
          {
            id: "show",
            title: "Show",
            text: "",
            show: problem.nodes.map(({ id }) => id),
            edges: ["ab"],
          },
        ],
      },
    ],
  });
}

function conflictEdges(contacts: ReturnType<typeof newRoutingDefects>) {
  return [
    ...new Set(
      contacts
        .flatMap(({ a, b }) => [a, b])
        .filter((id) => /^(line|label|step):/.test(id))
        .map((id) => id.slice(id.indexOf(":") + 1)),
    ),
  ];
}
