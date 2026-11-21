import { expect, test } from "vitest";
import { rerouteMovedEdges } from "../../../src/layout/moved-routes.js";
import { measureLabel } from "../../../src/layout/measure.js";
import { resolveGeometry } from "../../../src/layout/resolve.js";
import { check } from "../../../src/layout/stages/report.js";
import { segmentRectGap } from "../../../src/layout/stages/plane.js";
import { portFixture } from "./stretched-port-fixture.js";

function reportFor(
  fixture: Awaited<ReturnType<typeof portFixture>>,
  result = fixture.original,
) {
  const report = check(
    fixture.source,
    resolveGeometry(fixture.source, fixture.graph, result, measureLabel),
  );
  expect(report.hard, JSON.stringify(report)).toBe(0);
  expect(report.constraints.every((c) => c.holds)).toBe(true);
  const points = result.edges.ab.points;
  for (let i = 1; i < points.length; i++)
    for (const box of Object.values(result.nodes))
      expect(
        segmentRectGap(points[i - 1], points[i], box),
      ).toBeGreaterThanOrEqual(0);
}

const sides = ["top", "right", "bottom", "left"] as const;
for (const direction of ["down", "right"] as const)
  for (const from of sides)
    for (const to of sides)
      test(`${direction}, ${from} to ${to}: stretching retains ports and duplicate endpoints`, async () => {
        const fixture = await portFixture(from, to, direction);
        const { problem, original, graph } = fixture;
        const before = structuredClone(original);
        reportFor(fixture);
        const nodes = structuredClone(original.nodes);
        nodes.a[0] += 1;
        nodes.a[1] += 1;
        nodes.b[0] += 2;
        nodes.b[1] += 2;
        const result = rerouteMovedEdges(
          graph,
          original,
          nodes,
          problem.constraints,
        );
        const points = result.edges.ab.points;
        expect(points).toHaveLength(original.edges.ab.points.length);
        expect(points[0]).toEqual(
          original.edges.ab.points[0].map((v) => v + 1),
        );
        expect(points.at(-1)).toEqual(
          original.edges.ab.points.at(-1)!.map((v) => v + 2),
        );
        expect(points[1]).toEqual(points[0]);
        expect(points.at(-2)).toEqual(points.at(-1));
        reportFor(fixture, result);
        expect(original).toEqual(before);
      });
