import { SourceMapSchema } from "../../../src/schema.js";
import type { Constraint } from "../../../src/layout/problem.js";
import {
  buildProblem,
  problemGraph,
} from "../../../src/layout/build-problem.js";
import { elkEngine } from "../../../src/layout/elk.js";
import { asPlacer } from "../../../src/layout/legacy.js";
import { measureLabel } from "../../../src/layout/measure.js";

type Side = Extract<Constraint, { kind: "side" }>["side"];
const base = {
  format: 3,
  id: "ports",
  title: "Ports",
  layers: { service: { label: "Service" } },
  nodes: {
    a: { label: "A", layer: "service" },
    b: { label: "B", layer: "service" },
  },
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
          show: ["a", "b"],
          edges: ["ab"],
        },
      ],
    },
  ],
};

export async function portFixture(
  from: Side,
  to: Side,
  direction: "down" | "right",
) {
  const source = SourceMapSchema.parse({
    ...base,
    direction,
    layout: {
      hints: [
        {
          kind: "side",
          strength: "required",
          edge: "ab",
          end: "from",
          side: from,
        },
        { kind: "side", strength: "required", edge: "ab", end: "to", side: to },
      ],
    },
  });
  const problem = buildProblem(source, measureLabel, false);
  const original = await asPlacer(elkEngine).place(problem);
  const points = original.edges.ab.points;
  points.unshift([...points[0]]);
  points.push([...points.at(-1)!]);
  return { source, problem, original, graph: problemGraph(problem) };
}
