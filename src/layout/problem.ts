import type { LayoutNode, LayoutEdge, LayoutLane } from "./types.js";

export type Strength = "required" | "preferred";
export type Direction = "down" | "right";
type Side = "top" | "right" | "bottom" | "left";
/** Direction, lanes and scenario intent are produced today. The remaining
 * kinds reserve the shared vocabulary for stated hints and fixed positions. */
export type Constraint = { strength: Strength } & (
  | { kind: "direction"; direction: Direction }
  | { kind: "lanes"; direction: Direction; lanes: readonly string[] }
  | { kind: "order"; nodes: readonly string[] }
  | { kind: "mainPath"; edges: readonly string[] }
  | { kind: "free"; edge: string }
  | { kind: "sameRank"; nodes: readonly string[] }
  | {
      kind: "relation";
      node: string;
      target: string;
      relation: "rightOf" | "leftOf" | "above" | "below" | "alignX" | "alignY";
      gap?: number;
    }
  | { kind: "pin"; node: string; position: readonly [number, number] }
  | { kind: "side"; edge: string; end: "from" | "to"; side: Side }
);
export type Capabilities = Partial<Record<Constraint["kind"], Strength>>;
/** Measured input only: no proposed node positions, routes or view box. */
export interface LayoutProblem {
  nodes: readonly LayoutNode[];
  edges: readonly LayoutEdge[];
  groups: readonly LayoutLane[];
  constraints: readonly Constraint[];
}
/** Independent verdict about a required lane rule on a drawing. */
export interface ConstraintVerdict {
  kind: "lanes";
  strength: "required";
  holds: boolean;
  message: string;
}
