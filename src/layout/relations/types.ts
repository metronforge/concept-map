/** Internal one-axis input. All measurements are in drawing units. */
export interface RelationSystem {
  variables: { id: string; size: number }[];
  /** Fixed coordinates must already lie on the 1/64 grid. */
  anchors: { id: string; variable: string; position: number }[];
  relations: DifferenceRelation[];
}

/** x[to] - x[from] >= gap (+ the named variable's size), or equality. */
export interface DifferenceRelation {
  id: string;
  from: string;
  to: string;
  kind: "minimum" | "equal";
  gap: number;
  size?: string;
}

/** Identifies a source constraint and which of its two bounds was used. */
export interface RelationSource {
  kind: "relation" | "anchor";
  id: string;
  reverse: boolean;
}

export interface RelationEdge {
  from: number;
  to: number;
  weight: number;
  source: RelationSource;
}

/** Vertex 0 is the fixed origin; variable i has vertex i + 1.
 * Sizes and edge weights are integer counts of 1/64 drawing unit.
 * Edges retain source order, with anchors first and equalities adjacent.
 */
export interface RelationGraph {
  variables: string[];
  sizes: number[];
  edges: RelationEdge[];
}
