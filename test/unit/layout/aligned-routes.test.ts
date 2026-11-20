import { expect, test } from "vitest";
import { SourceMapSchema } from "../../../src/schema.js";
import {
  buildProblem,
  problemGraph,
} from "../../../src/layout/build-problem.js";
import { dagreEngine } from "../../../src/layout/dagre.js";
import { elkEngine } from "../../../src/layout/elk.js";
import { measureLabel } from "../../../src/layout/measure.js";
import { alignBoxes } from "../../../src/layout/relations/align.js";
import { rerouteMovedEdges } from "../../../src/layout/moved-routes.js";
import { resolveGeometry } from "../../../src/layout/resolve.js";
import { placeAnnotations } from "../../../src/layout/stages/placement.js";
import { check } from "../../../src/layout/stages/report.js";

function source(direction: "down" | "right") {
  return SourceMapSchema.parse({
    format: 3,
    id: "outcomes",
    title: "Parallel outcomes",
    direction,
    layers: { work: { label: "Work" } },
    nodes: Object.fromEntries(
      ["start", "quick", "prepare", "finish"].map((id) => [
        id,
        { label: id, layer: "work" },
      ]),
    ),
    edges: {
      quick: { from: "start", to: "quick", label: "Quick" },
      prepare: { from: "start", to: "prepare", label: "Prepare" },
      finish: { from: "prepare", to: "finish", label: "Finish" },
    },
    scenarios: [
      {
        id: "all",
        label: "All",
        steps: [
          {
            id: "show",
            title: "Show",
            text: "",
            show: ["start", "quick", "prepare", "finish"],
            edges: ["quick", "prepare", "finish"],
          },
        ],
      },
    ],
    layout: {
      hints: [
        { kind: "sameRank", strength: "required", nodes: ["quick", "finish"] },
      ],
    },
  });
}

for (const [name, engine] of [
  ["dagre", dagreEngine],
  ["elk", elkEngine],
] as const)
  for (const direction of ["down", "right"] as const)
    test(`${name}, ${direction}: alignment keeps attached arrows and no hard defects`, async () => {
      const map = source(direction);
      const problem = buildProblem(map, measureLabel, false);
      const graph = problemGraph(problem);
      const placed = await engine.layout(graph);
      const before = structuredClone(placed);
      const aligned = alignBoxes(problem, placed.nodes, 64, 32);
      if (aligned.status !== "determined") throw new Error(aligned.status);
      const routed = rerouteMovedEdges(
        graph,
        placed,
        aligned.nodes,
        problem.constraints,
      );
      const geometry = resolveGeometry(map, graph, routed, measureLabel);
      geometry.measurement = {
        name: "font-table",
        labels: Object.fromEntries(
          graph.edges.filter((e) => e.label).map((e) => [e.id, e.label!]),
        ),
      };
      const resolved = placeAnnotations(geometry);
      const report = check(map, resolved);
      expect(report.hard).toBe(0);
      expect(report.constraints).toEqual([
        expect.objectContaining({ kind: "sameRank", holds: true }),
      ]);
      expect(routed.edges.prepare).toBe(placed.edges.prepare);
      const plain = resolveGeometry(map, graph, placed, measureLabel);
      expect(
        resolved.viewBox[direction === "right" ? 0 : 1],
      ).toBeGreaterThanOrEqual(plain.viewBox[direction === "right" ? 0 : 1]);
      expect(placed).toEqual(before);
    });
