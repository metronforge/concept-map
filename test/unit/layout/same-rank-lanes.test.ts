import { expect, test } from "vitest";
import {
  buildProblem,
  problemGraph,
} from "../../../src/layout/build-problem.js";
import { dagreEngine } from "../../../src/layout/dagre.js";
import { elkEngine } from "../../../src/layout/elk.js";
import {
  measureLabel,
  fontTableMeasurer,
} from "../../../src/layout/measure.js";
import { alignSameRank } from "../../../src/layout/same-rank.js";
import { acceptSameRank } from "../../../src/layout/same-rank-boundary.js";
import { checkRelations } from "../../../src/layout/relations/check.js";
import { laneRankRelations } from "../../../src/layout/relations/lane-rank.js";
import { createRouteInspector } from "../../../src/layout/inspect-routes.js";
import { resolveMeasured } from "../../../src/layout/resolve-measured.js";
import { placeAnnotations } from "../../../src/layout/stages/placement.js";
import { check } from "../../../src/layout/stages/report.js";
import type { LayoutEngine, LayoutResult } from "../../../src/layout/types.js";
import { laneSource } from "./lane-rank-fixture.js";

async function fixture(
  engine: LayoutEngine,
  direction: "down" | "right",
  conflict: boolean,
) {
  const source = laneSource(direction, conflict);
  const problem = buildProblem(source, measureLabel, false);
  const graph = problemGraph(problem);
  const original = await engine.layout(graph);
  const resolve = (result: LayoutResult) =>
    placeAnnotations(resolveMeasured(source, graph, result, fontTableMeasurer));
  const inspect = createRouteInspector(
    source,
    graph,
    original,
    fontTableMeasurer,
  );
  return { source, problem, graph, original, resolve, inspect };
}

for (const [name, engine] of [
  ["dagre", dagreEngine],
  ["elk", elkEngine],
] as const)
  for (const direction of ["down", "right"] as const) {
    test(`${name}, ${direction}: alignment grows lanes and moves followers without hard defects`, async () => {
      const f = await fixture(engine, direction, false);
      const before = structuredClone(f.original);
      const outcome = alignSameRank(
        f.problem,
        f.graph,
        f.original,
        64,
        36,
        f.inspect,
      );
      if (outcome.status !== "determined") throw new Error(outcome.status);
      const axis = direction === "down" ? 1 : 0;
      expect(outcome.result.nodes.quick[axis]).toBe(
        outcome.result.nodes.finish[axis],
      );
      expect(outcome.result.nodes.observer[axis]).toBeGreaterThan(
        before.nodes.observer[axis],
      );
      expect(outcome.result.lanes.first[axis + 2]).toBeGreaterThan(
        before.lanes.first[axis + 2],
      );
      const report = check(f.source, f.resolve(outcome.result));
      expect(report.hard, JSON.stringify(report)).toBe(0);
      expect(report.constraints.every((c) => c.holds)).toBe(true);
      expect(outcome.result.edges.prepare).toBe(f.original.edges.prepare);
      expect(outcome.dropped).toEqual([]);
      expect(f.original).toEqual(before);
    });

    test(`${name}, ${direction}: required cross-lane hints retain a checked lane witness`, async () => {
      const f = await fixture(engine, direction, true);
      const outcome = alignSameRank(
        f.problem,
        f.graph,
        f.original,
        64,
        36,
        f.inspect,
      );
      expect(outcome.status).toBe("contradictory");
      if (outcome.status !== "contradictory") throw new Error(outcome.status);
      expect(
        checkRelations(laneRankRelations(f.problem, f.original, 64), outcome),
      ).toBe(true);
      const ids = outcome.cycle.map((c) => c.id);
      for (const path of ["lanes.first", "lanes.second", "layout.hints[0]"])
        expect(ids.some((id) => id.startsWith(path))).toBe(true);
      expect(() => acceptSameRank(outcome)).toThrowError(
        expect.objectContaining({
          kind: "same-rank-contradiction",
          data: outcome,
          message: expect.stringMatching(/lanes\.first.*lanes\.second/s),
        }),
      );
    });

    test(`${name}, ${direction}: preferred cross-lane hints drop without moving anything`, async () => {
      const f = await fixture(engine, direction, true);
      f.problem.constraints = f.problem.constraints.map((c) =>
        c.kind === "sameRank" ? { ...c, strength: "preferred" } : c,
      );
      const outcome = alignSameRank(
        f.problem,
        f.graph,
        f.original,
        64,
        36,
        f.inspect,
      );
      if (outcome.status !== "determined") throw new Error(outcome.status);
      expect(outcome.result).toBe(f.original);
      expect(outcome.dropped).toHaveLength(1);
      expect(outcome.dropped[0].reason).toBe("contradiction");
      expect(acceptSameRank(outcome).unsupported).toEqual([
        {
          ...outcome.dropped[0].hint,
          reason: "contradiction",
          conflicts: outcome.dropped[0].conflicts,
        },
      ]);
      for (const path of ["lanes.first", "lanes.second", "layout.hints[0]"])
        expect(
          outcome.dropped[0].conflicts.some((id) => id.startsWith(path)),
        ).toBe(true);
    });
  }
