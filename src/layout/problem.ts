import type {
  LayoutNode,
  LayoutEdge,
  LayoutLane,
  StatedHint,
} from "./types.js";

export type Strength = "required" | "preferred";
export type Direction = "down" | "right";
type Side = "top" | "right" | "bottom" | "left";
/** Stated constraints carry their source path; derived intent leaves it absent. */
export type Constraint = {
  strength: Strength;
  origin?: "stated";
  path?: string;
} & (
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
/** Independent verdict about source intent on a drawing. */
export type ConstraintVerdict = { message: string } & (
  | ({ holds: null } & Extract<StatedHint, { kind: "free" }>)
  | ({ holds: boolean } & (
      | { kind: "lanes"; strength: "required" }
      | {
          kind: "sameRank";
          strength: Strength;
          origin: "stated";
          path: string;
          nodes: readonly string[];
        }
      | Extract<StatedHint, { kind: "side" }>
    ))
);
