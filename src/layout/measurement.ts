export interface LabelSize {
  width: number;
  height: number;
  /** Ink bounds relative to the text baseline; omitted by font tables. */
  left?: number;
  ascent?: number;
  /** Painted halo outside the ink bounds, used when placing numbers. */
  padding?: number;
  /** Optional browser wrapping, measured as one centred text block. */
  wrap?: { lines: string[]; lineHeight: number };
}
export interface LabelStyle {
  fontSize: number;
  mono: boolean;
  letterSpacing?: number;
  /** Arrow identity when measuring text already present in a drawing. */
  edge?: string;
}
export type LabelMeasurer = (text: string, style: LabelStyle) => LabelSize;

/** Supplies text sizes in map units; browsers own font access. */
export interface Measurer {
  readonly name: string;
  measure: LabelMeasurer;
}
