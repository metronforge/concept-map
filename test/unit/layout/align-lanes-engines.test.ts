import { expect, test } from "vitest";
import {
  buildProblem,
  problemGraph,
} from "../../../src/layout/build-problem.js";
import { dagreEngine } from "../../../src/layout/dagre.js";
import { elkEngine } from "../../../src/layout/elk.js";
import { measureLabel } from "../../../src/layout/measure.js";
import { alignLaneRanks } from "../../../src/layout/relations/align-lanes.js";
import { laneRankRelations } from "../../../src/layout/relations/lane-rank.js";
import { checkRelations } from "../../../src/layout/relations/check.js";
import { laneSource } from "./lane-rank-fixture.js";

for (const [name, engine] of [
  ["dagre", dagreEngine],
  ["elk", elkEngine],
] as const) {
  for (const direction of ["down", "right"] as const) {
    test(`${name}, ${direction}: apply lane growth and preserve unforced engine ranks`, async () => {
      const problem = buildProblem(
        laneSource(direction, false),
        measureLabel,
        false,
      );
      const original = await engine.layout(problemGraph(problem));
      const before = structuredClone(original);
      const aligned = alignLaneRanks(problem, original, 64);
      if (aligned.status !== "determined") throw new Error(aligned.status);
      const axis = direction === "down" ? 1 : 0;
      expect(aligned.nodes.quick[axis]).toBe(aligned.nodes.finish[axis]);
      expect(aligned.nodes.observer[axis]).toBeGreaterThan(
        original.nodes.observer[axis],
      );
      expect(aligned.lanes.first[axis + 2]).toBeGreaterThan(
        original.lanes.first[axis + 2],
      );
      for (const id of ["start", "prepare"])
        expect(aligned.nodes[id]).toEqual(original.nodes[id]);
      for (const n of problem.nodes) {
        const box = aligned.nodes[n.id];
        const lane = aligned.lanes[n.lane!];
        expect(box[axis]).toBeGreaterThanOrEqual(lane[axis]);
        expect(box[axis] + box[axis + 2]).toBeLessThanOrEqual(
          lane[axis] + lane[axis + 2],
        );
        expect(box[1 - axis]).toBe(original.nodes[n.id][1 - axis]);
      }
      expect(
        aligned.lanes.first[axis] + aligned.lanes.first[axis + 2],
      ).toBeLessThanOrEqual(aligned.lanes.second[axis]);
      expect(original).toEqual(before);
    });

    test(`${name}, ${direction}: cross-lane alignment returns checked lane paths`, async () => {
      const problem = buildProblem(
        laneSource(direction, true),
        measureLabel,
        false,
      );
      const original = await engine.layout(problemGraph(problem));
      const before = structuredClone(original);
      const aligned = alignLaneRanks(problem, original, 64);
      expect(aligned.status).toBe("contradictory");
      if (aligned.status !== "contradictory") throw new Error(aligned.status);
      expect(
        checkRelations(laneRankRelations(problem, original, 64), aligned),
      ).toBe(true);
      const ids = aligned.cycle.map((r) => r.id);
      for (const path of ["lanes.first", "lanes.second", "layout.hints[0]"])
        expect(ids.some((id) => id.startsWith(path))).toBe(true);
      expect(original).toEqual(before);
    });
  }
}
