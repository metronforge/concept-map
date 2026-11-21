import { expect, test } from "vitest";
import { SourceMapSchema } from "../../../src/schema.js";
import { newRoutingDefects } from "../../../src/layout/routing-defects.js";
import { rerouteMovedEdges } from "../../../src/layout/moved-routes.js";
import { resolveGeometry } from "../../../src/layout/resolve.js";
import { measureLabel } from "../../../src/layout/measure.js";
import type { LayoutResult } from "../../../src/layout/types.js";
import { check } from "../../../src/layout/stages/report.js";

const source = SourceMapSchema.parse({
  format: 3,
  id: "stretch",
  title: "Stretch",
  layers: { work: { label: "Work" } },
  nodes: { a: { label: "A", layer: "work" }, b: { label: "B", layer: "work" } },
  edges: { ab: { from: "a", to: "b" } },
  scenarios: [
    {
      id: "all",
      label: "All",
      steps: [{ id: "show", title: "Show", text: "" }],
    },
  ],
});
const graph = {
  nodes: [
    { id: "a", width: 60, height: 36 },
    { id: "b", width: 60, height: 36 },
  ],
  edges: [{ id: "ab", from: "a", to: "b" }],
  lanes: [],
};
const original: LayoutResult = {
  nodes: { a: [0, 0, 60, 36], b: [160, 120, 60, 36] },
  lanes: {},
  edges: {
    ab: {
      points: [
        [60, 18],
        [80, 18],
        [80, 138],
        [160, 138],
      ],
    },
  },
};

test("stretching past the first bend identifies the arrow through its source", () => {
  const moved = {
    ...original.nodes,
    a: [40, 0, 60, 36] as [number, number, number, number],
  };
  const result = rerouteMovedEdges(graph, original, moved);
  expect(result.edges.ab.points.slice(0, 2)).toEqual([
    [100, 18],
    [80, 18],
  ]);
  const before = resolveGeometry(source, graph, original, measureLabel);
  const after = resolveGeometry(source, graph, result, measureLabel);
  // Isolate route safety from the independently placed step number.
  delete before.edges.ab.badge;
  delete after.edges.ab.badge;
  expect(check(source, after).hard).toBe(0);
  expect(newRoutingDefects(source, before, after)).toEqual([
    expect.objectContaining({ a: "node:a", b: "line:ab", band: "defect" }),
  ]);
  expect(newRoutingDefects(source, before, before)).toEqual([]);
});
