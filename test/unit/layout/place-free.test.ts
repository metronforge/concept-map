import { expect, it } from "vitest";
import { SourceMapSchema } from "../../../src/schema.js";
import { buildProblem } from "../../../src/layout/build-problem.js";
import { ResultRejectedError } from "../../../src/layout/errors.js";
import { fontTableMeasurer } from "../../../src/layout/measure.js";
import { placeFree } from "../../../src/layout/place-free.js";
import type { LayoutProblem } from "../../../src/layout/problem.js";
import type { Placer } from "../../../src/layout/ports.js";
import type { LayoutResult } from "../../../src/layout/types.js";

function fixture(strength: "required" | "preferred" = "required") {
  const source = SourceMapSchema.parse({
    format: 3,
    id: "free-placement",
    title: "Free placement",
    layers: { work: { label: "Work" } },
    nodes: {
      a: { label: "A", layer: "work" },
      b: { label: "B", layer: "work" },
    },
    edges: { ab: { from: "a", to: "b" } },
    layout: { hints: [{ kind: "free", edge: "ab", strength }] },
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
  });
  const problem = buildProblem(source, fontTableMeasurer.measure, false);
  return { source, problem };
}

function placer(mode: "normal" | "omitted" | "throw" = "normal") {
  const calls: LayoutProblem[] = [];
  const engine: Placer = {
    name: "fake",
    capabilities: { direction: "preferred" },
    async place(problem) {
      calls.push(problem);
      if (mode === "throw" && calls.length === 2)
        throw Error("candidate failed");
      const nodes = Object.fromEntries(
        problem.nodes.map((n, i) => [
          n.id,
          [i * 100, calls.length === 2 && i === 1 ? 80 : 0, n.width, n.height],
        ]),
      );
      const baseline: LayoutResult = {
        nodes,
        lanes: {},
        edges: {
          ab: {
            points: [
              [nodes.a[2], nodes.a[3] / 2],
              [100, nodes.b[3] / 2],
            ],
          },
        },
      };
      if (calls.length === 1 || mode === "omitted") return baseline;
      return { ...baseline, edges: {} };
    },
  };
  return { engine, calls };
}

it("places without the free arrow and routes it around the placed boxes", async () => {
  const { source, problem } = fixture();
  const { engine, calls } = placer();
  const outcome = await placeFree(source, problem, engine, fontTableMeasurer);
  expect(outcome.kind).toBe("placed");
  if (outcome.kind !== "placed") return;
  expect(calls.map((call) => call.edges.map((edge) => edge.id))).toEqual([
    ["ab"],
    [],
  ]);
  expect(calls[1].constraints.some((hint) => hint.kind === "free")).toBe(false);
  expect(outcome.result.nodes.b[1]).toBe(80);
  expect(outcome.result.edges.ab.points.length).toBeGreaterThan(2);
  expect(outcome.dropped).toEqual([]);
});

it.each(["omitted", "throw"] as const)(
  "falls back when the candidate %s",
  async (mode) => {
    const { source, problem } = fixture("preferred");
    const { engine } = placer(mode);
    const outcome = await placeFree(source, problem, engine, fontTableMeasurer);
    expect(outcome.kind).toBe("placed");
    if (outcome.kind !== "placed") return;
    expect(outcome.result.edges.ab.points).toHaveLength(2);
    expect(outcome.dropped).toMatchObject([
      { kind: "free", reason: "unsupported", conflicts: ["ab"] },
    ]);
  },
);

it("rejects a required free hint when the candidate fails", async () => {
  const { source, problem } = fixture();
  await expect(
    placeFree(source, problem, placer("throw").engine, fontTableMeasurer),
  ).rejects.toBeInstanceOf(ResultRejectedError);
});
