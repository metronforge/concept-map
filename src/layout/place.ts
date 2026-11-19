import type { LayoutProblem } from "./problem.js";
import type { Placer } from "./ports.js";
import type { PlacementOutcome } from "./outcomes.js";
import { checkedResult } from "./check.js";
import { problemGraph } from "./build-problem.js";
import { constraintName } from "./hints.js";

/** Negotiate before calling untrusted code; an exception is never a proof. */
export async function place(
  problem: LayoutProblem,
  placer: Placer,
): Promise<PlacementOutcome> {
  const unsupported = problem.constraints.filter((c) => {
    const capability = placer.capabilities[c.kind];
    const strength =
      typeof capability === "object"
        ? capability[c.origin ?? "derived"]
        : capability;
    return !(strength === "required" || strength === c.strength);
  });
  const required = unsupported.filter((c) => c.strength === "required");
  if (required.length)
    return {
      kind: "unsupported-constraints",
      placer: placer.name,
      constraints: required,
      message: `Required constraints ${required.map(constraintName).join(", ")} are unsupported by ${placer.name}`,
    };
  try {
    const result = await placer.place(
      JSON.parse(JSON.stringify(problem)) as LayoutProblem,
    );
    return {
      kind: "placed",
      result: checkedResult(result, problemGraph(problem)),
      unsupported,
    };
  } catch (cause) {
    return {
      kind: "engine-failed",
      placer: placer.name,
      cause,
      message: `${placer.name} failed: ${cause instanceof Error ? cause.message : String(cause)}`,
    };
  }
}
