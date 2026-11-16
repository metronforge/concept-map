import type { LayoutProblem, Capabilities } from "./problem.js";
import type { LayoutResult } from "./types.js";

/** Proposes geometry. Capabilities are promises, never checker evidence. */
export interface Placer {
  readonly name: string;
  readonly capabilities: Capabilities;
  place(problem: LayoutProblem): Promise<LayoutResult>;
}
