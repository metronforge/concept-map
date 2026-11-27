import type { LayoutReport } from "./stages/report.js";

/** Base for layout boundary exceptions; pipeline outcomes remain plain data. */
export class LayoutError<K extends string = string, D = unknown> extends Error {
  constructor(
    public readonly kind: K,
    public readonly data: D,
    message: string,
  ) {
    super(message);
    this.name = "LayoutError";
  }
}
/** An engine exception or malformed geometry, not a statement about the map. */
export class EngineFailedError extends LayoutError<
  "engine-failed",
  { placer: string; cause: unknown; message: string }
> {
  readonly placer: string;
  override readonly cause: unknown;
  constructor(data: { placer: string; cause: unknown; message: string }) {
    super("engine-failed", data, data.message);
    this.name = "EngineFailedError";
    this.placer = data.placer;
    this.cause = data.cause;
  }
}
/** A proposer violated a required constraint in its returned drawing. */
export class ResultRejectedError extends LayoutError<
  "result-rejected",
  { placer: string; constraint: string; message: string }
> {
  readonly placer: string;
  readonly constraint: string;
  constructor(data: { placer: string; constraint: string; message: string }) {
    super("result-rejected", data, data.message);
    this.name = "ResultRejectedError";
    this.placer = data.placer;
    this.constraint = data.constraint;
  }
}
/** The placer does not support the required constraints. */
export class UnsupportedConstraintsError extends LayoutError<
  "unsupported-constraints",
  {
    placer: string;
    constraints: readonly {
      kind: string;
      strength: "required" | "preferred";
    }[];
    message: string;
  }
> {
  readonly placer: string;
  readonly constraints: readonly {
    kind: string;
    strength: "required" | "preferred";
  }[];
  constructor(data: {
    placer: string;
    constraints: readonly {
      kind: string;
      strength: "required" | "preferred";
    }[];
    message: string;
  }) {
    super("unsupported-constraints", data, data.message);
    this.name = "UnsupportedConstraintsError";
    this.placer = data.placer;
    this.constraints = data.constraints;
  }
}
/** Strict layout found hard defects; carries the complete quality report. */
export class LayoutDefectsError extends LayoutError<
  "layout-defects",
  LayoutReport
> {
  override name = "LayoutDefectsError" as const;
  constructor(
    public readonly report: LayoutReport,
    message: string,
  ) {
    super("layout-defects", report, message);
  }
}
/** A stated same-rank hint involved in an alignment error. */
export type SameRankHint = {
  kind: "sameRank";
  nodes: readonly string[];
  strength: "required" | "preferred";
  origin?: "stated";
  path?: string;
};
/** Source references proving that required alignments conflict. */
export type SameRankContradictionData = {
  status: "contradictory";
  hints: readonly SameRankHint[];
  /** Source paths of hints and lanes, and arrow ids, in cycle order, without duplicates. */
  conflicts: readonly string[];
  message: string;
};
/** The hints and arrows involved when alignment introduces hard contacts. */
export type SameRankRoutingData = {
  status: "routing-failed";
  hints: readonly SameRankHint[];
  conflicts: readonly string[];
  message: string;
};

/** A checked cycle proves that required same-rank relations conflict. */
export class SameRankContradictionError extends LayoutError<
  "same-rank-contradiction",
  SameRankContradictionData
> {
  constructor(data: SameRankContradictionData) {
    super("same-rank-contradiction", data, data.message);
    this.name = "SameRankContradictionError";
  }
}
/** Placement succeeded, but stretching introduced hard arrow contacts. */
export class SameRankRoutingError extends LayoutError<
  "same-rank-routing",
  SameRankRoutingData
> {
  constructor(data: SameRankRoutingData) {
    super("same-rank-routing", data, data.message);
    this.name = "SameRankRoutingError";
  }
}
const matches = (value: unknown, name: string, kind: string): boolean =>
  typeof value === "object" &&
  value !== null &&
  "name" in value &&
  "kind" in value &&
  value.name === name &&
  value.kind === kind;
/** Recognise an engine error across package copies. */
export const isEngineFailedError = (
  value: unknown,
): value is EngineFailedError =>
  matches(value, "EngineFailedError", "engine-failed");
/** Recognise a rejected result across package copies. */
export const isResultRejectedError = (
  value: unknown,
): value is ResultRejectedError =>
  matches(value, "ResultRejectedError", "result-rejected");
/** Recognise a capability refusal across package copies. */
export const isUnsupportedConstraintsError = (
  value: unknown,
): value is UnsupportedConstraintsError =>
  matches(value, "UnsupportedConstraintsError", "unsupported-constraints");
/** Recognise strict quality errors across package copies. */
export const isLayoutDefectsError = (
  value: unknown,
): value is LayoutDefectsError =>
  matches(value, "LayoutDefectsError", "layout-defects");
/** Recognise a same-rank contradiction across package copies. */
export const isSameRankContradictionError = (
  value: unknown,
): value is SameRankContradictionError =>
  matches(value, "SameRankContradictionError", "same-rank-contradiction");
/** Recognise a same-rank routing failure across package copies. */
export const isSameRankRoutingError = (
  value: unknown,
): value is SameRankRoutingError =>
  matches(value, "SameRankRoutingError", "same-rank-routing");
/** Recognise the base error and each specialised layout error. */
export const isLayoutError = (value: unknown): value is LayoutError =>
  isEngineFailedError(value) ||
  isResultRejectedError(value) ||
  isUnsupportedConstraintsError(value) ||
  isLayoutDefectsError(value) ||
  isSameRankContradictionError(value) ||
  isSameRankRoutingError(value) ||
  (typeof value === "object" &&
    value !== null &&
    "kind" in value &&
    typeof value.kind === "string" &&
    matches(value, "LayoutError", value.kind));
