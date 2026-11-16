import type { LayoutEngine } from "./types.js";
import type { Placer } from "./ports.js";
import { problemGraph } from "./build-problem.js";

/** These are already obligations of LayoutEngine's graph/result contract.
 * In particular lanes are independently checked, even for old custom engines. */
export function asPlacer(engine: LayoutEngine): Placer {
  if (
    "place" in engine &&
    typeof engine.place === "function" &&
    "name" in engine &&
    "capabilities" in engine
  )
    return engine as LayoutEngine & Placer;
  return {
    name: "legacy LayoutEngine",
    capabilities: { direction: "preferred", lanes: "required" },
    place: (problem) => engine.layout(problemGraph(problem)),
  };
}
