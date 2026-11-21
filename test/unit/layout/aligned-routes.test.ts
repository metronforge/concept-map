import { expect, test } from "vitest";
import type { LayoutGraph, LayoutResult } from "../../../src/layout/types.js";
import { SourceMapSchema } from "../../../src/schema.js";
import {
  buildProblem,
  problemGraph,
} from "../../../src/layout/build-problem.js";
import { dagreEngine } from "../../../src/layout/dagre.js";
import { elkEngine } from "../../../src/layout/elk.js";
import { measureLabel } from "../../../src/layout/measure.js";
import { alignSameRank } from "../../../src/layout/same-rank.js";
import { resolveGeometry } from "../../../src/layout/resolve.js";
import { placeAnnotations } from "../../../src/layout/stages/placement.js";
import { newRoutingDefects } from "../../../src/layout/routing-defects.js";
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
      const resolve = (result: LayoutResult) =>
        resolveDrawing(map, graph, result);
      const baseline = resolve(placed);
      const inspect = (result: typeof placed) =>
        newRoutingDefects(map, baseline, resolve(result)).flatMap(
          ({ a, b }) => [a, b],
        );
      const aligned = alignSameRank(problem, graph, placed, 64, 32, inspect);
      if (aligned.status !== "determined") throw new Error(aligned.status);
      expect(aligned.dropped).toEqual([]);
      const routed = aligned.result;
      const resolved = resolve(routed);
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

function resolveDrawing(
  map: ReturnType<typeof source>,
  graph: LayoutGraph,
  result: LayoutResult,
) {
  const geometry = resolveGeometry(map, graph, result, measureLabel);
  geometry.measurement = {
    name: "font-table",
    labels: Object.fromEntries(
      graph.edges.filter((e) => e.label).map((e) => [e.id, e.label!]),
    ),
  };
  return placeAnnotations(geometry);
}
