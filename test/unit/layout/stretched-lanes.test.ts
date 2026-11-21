import { expect, test } from "vitest";
import {
  buildProblem,
  problemGraph,
} from "../../../src/layout/build-problem.js";
import { dagreEngine } from "../../../src/layout/dagre.js";
import { elkEngine } from "../../../src/layout/elk.js";
import { measureLabel } from "../../../src/layout/measure.js";
import { rerouteMovedEdges } from "../../../src/layout/moved-routes.js";
import { alignLaneRanks } from "../../../src/layout/relations/align-lanes.js";
import { resolveGeometry } from "../../../src/layout/resolve.js";
import { placeAnnotations } from "../../../src/layout/stages/placement.js";
import { check } from "../../../src/layout/stages/report.js";
import { laneSource } from "./lane-rank-fixture.js";

for (const [name, engine] of [
  ["dagre", dagreEngine],
  ["elk", elkEngine],
] as const)
  for (const direction of ["down", "right"] as const)
    test(`${name}, ${direction}: stretched lane followers preserve bends and avoid boxes`, async () => {
      const source = laneSource(direction, false);
      const problem = buildProblem(source, measureLabel, false);
      const graph = problemGraph(problem);
      const original = await engine.layout(graph);
      const before = structuredClone(original);
      const aligned = alignLaneRanks(problem, original, 64);
      if (aligned.status !== "determined") throw new Error(aligned.status);
      const result = {
        ...rerouteMovedEdges(graph, original, aligned.nodes),
        lanes: aligned.lanes,
      };
      const resolved = placeAnnotations(
        resolveGeometry(source, graph, result, measureLabel),
      );
      const report = check(source, resolved);
      expect(report.hard, JSON.stringify(report)).toBe(0);
      expect(report.constraints.every((c) => c.holds)).toBe(true);
      expect(result.edges.prepare).toBe(original.edges.prepare);
      expect(result.edges.quick.points.slice(0, -1)).toEqual(
        original.edges.quick.points.slice(0, -1),
      );
      if (name === "elk" && direction === "down")
        expect(result.edges.quick.points).toEqual([
          [69, 48],
          [69, 58],
          [148, 58],
          [148, 212],
        ]);
      expect(original).toEqual(before);
    });
