import { SourceMapSchema, ResolvedMapSchema } from "../../../src/schema.js";

export const hint = { kind: "sameRank", nodes: ["a", "b"] };
export function source(strength?: string, direction = "down") {
  return SourceMapSchema.parse({
    format: 3,
    id: "ranks",
    title: "Ranks",
    direction,
    layers: { service: { label: "Service" } },
    nodes: {
      a: { label: "A", layer: "service" },
      b: { label: "B", layer: "service" },
    },
    scenarios: [
      {
        id: "all",
        label: "All",
        steps: [{ id: "show", title: "Show", text: "", show: ["a", "b"] }],
      },
    ],
    layout: { hints: [{ ...hint, ...(strength ? { strength } : {}) }] },
  });
}
export function drawing(direction = "down", strength?: string) {
  const map = source(strength, direction);
  return ResolvedMapSchema.parse({
    ...map,
    viewBox: [300, 300],
    nodes: {
      a: { ...map.nodes.a, box: [10, 10, 50, 30] },
      b: {
        ...map.nodes.b,
        box: direction === "down" ? [100, 10, 70, 50] : [10, 100, 70, 50],
      },
    },
  });
}
