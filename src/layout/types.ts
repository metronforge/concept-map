import type { Measurer, LabelMeasurer, LabelSize } from "./measurement.js";
import type { SourceMap } from "../schema.js";
export type { LabelMeasurer, LabelSize, LabelStyle } from "./measurement.js";
/** Coordinates in SVG user units, relative to the graph origin. */
export type LayoutPoint = [number, number];
export type LayoutBox = [number, number, number, number];
export interface LayoutNode extends LabelSize {
  id: string;
  lane?: string;
}
export interface LayoutEdge {
  id: string;
  from: string;
  to: string;
  label?: LabelSize & { text?: string };
}
/** Lanes follow the layout direction. Unassigned nodes follow the last lane. */
export interface LayoutLane {
  id: string;
  label: LabelSize;
}
export interface LayoutGraph {
  direction?: "down" | "right";
  nodes: readonly LayoutNode[];
  edges: readonly LayoutEdge[];
  lanes: readonly LayoutLane[];
}
export interface LayoutRoute {
  points: LayoutPoint[];
  label?: LayoutPoint;
}
/** Every graph id must have exactly one geometry entry; label points are centres. */
export interface LayoutResult {
  nodes: Record<string, LayoutBox>;
  edges: Record<string, LayoutRoute>;
  lanes: Record<string, LayoutBox>;
}
export interface LayoutEngine {
  layout(graph: LayoutGraph): Promise<LayoutResult>;
}
/** An author hint identified by its position in the source map. */
export type StatedHint = NonNullable<SourceMap["layout"]>["hints"][number] & {
  origin: "stated";
  path: string;
};
export interface LayoutOptions {
  measureLabel?: LabelMeasurer | Measurer;
  /** Receive unsupported preferred hints once per source layout, before
   * geometry is resolved. Required hints throw instead; hand maps do not call it. */
  onUnsupportedHints?: (hints: readonly StatedHint[]) => void;
  /** Derive preferred order, main path and return edges from the first scenario.
   * Defaults to true; false allows comparison with graph-only placement.
   * Hand geometry is retained either way. */
  intent?: boolean;
  /** Available width in em of arrow-label text; finite and positive.
   * Reserve enlarged text, then refine annotations at the resulting scale.
   * Omit for the natural layout. Hand geometry is always retained. */
  widthEm?: number;
  /**
   * Check the result with `check` and throw `LayoutDefectsError` when it has
   * hard defects: covered labels, step numbers over labels or boxes, lines
   * over boxes. Hand-drawn maps are checked too.
   */
  strict?: boolean;
}
