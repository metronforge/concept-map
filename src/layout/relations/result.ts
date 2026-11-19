import type { RelationSource } from "./types.js";

/** All returned measurements use drawing units, not integer ticks. */
export interface RelationPlacement {
  variable: string;
  position: number;
}

export type RelationSolution =
  | {
      status: "determined";
      /** Each chain runs from the fixed origin to this variable. */
      placements: (RelationPlacement & { chain: RelationSource[] })[];
    }
  | {
      status: "contradictory";
      /** Directed source bounds in cycle order, including anchors if needed. */
      cycle: RelationSource[];
      sum: number;
    }
  | {
      status: "underdetermined";
      /** A feasible placement, without a claim of minimality. */
      placements: RelationPlacement[];
      /** These variables can all move by delta while the others stay fixed. */
      shift: { variables: string[]; delta: number };
    };
