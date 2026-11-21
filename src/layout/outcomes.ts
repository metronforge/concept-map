import type { Constraint } from "./problem.js";
import type { LayoutResult, UnsupportedHint } from "./types.js";

export interface EngineFailure {
  kind: "engine-failed";
  placer: string;
  message: string;
  cause: unknown;
}
/** A capability refusal says nothing about whether the map is satisfiable. */
export interface UnsupportedConstraints {
  kind: "unsupported-constraints";
  placer: string;
  message: string;
  constraints: readonly Constraint[];
}
export type PlacementOutcome =
  | EngineFailure
  | UnsupportedConstraints
  | {
      kind: "placed";
      result: LayoutResult;
      unsupported: readonly Constraint[];
      dropped?: readonly UnsupportedHint[];
    };
const hasKind = (value: unknown, kind: string): boolean =>
  typeof value === "object" &&
  value !== null &&
  "kind" in value &&
  value.kind === kind;
export const isEngineFailure = (value: unknown): value is EngineFailure =>
  hasKind(value, "engine-failed");
export const isUnsupportedConstraints = (
  value: unknown,
): value is UnsupportedConstraints => hasKind(value, "unsupported-constraints");
