/** Coordinates in SVG user units, relative to the graph origin. */
export type LayoutPoint = [number, number];
export type LayoutBox = [number, number, number, number];
export interface LabelSize {
  width: number;
  height: number;
}
export interface LabelStyle {
  fontSize: number;
  mono: boolean;
  letterSpacing?: number;
}
export type LabelMeasurer = (text: string, style: LabelStyle) => LabelSize;
export interface LayoutNode extends LabelSize {
  id: string;
  lane?: string;
}
export interface LayoutEdge {
  id: string;
  from: string;
  to: string;
  label?: LabelSize;
}
/** Lanes are ordered top to bottom. Nodes without a lane follow the last lane. */
export interface LayoutLane {
  id: string;
  label: LabelSize;
}
export interface LayoutGraph {
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
export interface LayoutOptions {
  measureLabel?: LabelMeasurer;
}
