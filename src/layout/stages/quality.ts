import type { ConstraintVerdict } from "../problem.js";
import type { LabelMeasurer } from "../types.js";
import type { Reading } from "./reading.js";

/**
 * `clear`: the gap is at least the margin. `defect`: the shapes overlap by
 * more than the tolerance. `tight`: in between. Browsers place text a fraction
 * of a pixel apart, so a single threshold would flip between them.
 */
export type Band = "clear" | "tight" | "defect";

/** Two drawn things that are too close. Only tight and defect contacts are listed. */
export interface Contact {
  /** What is covered or crowded, such as `label:pay` or `step:pay`. */
  a: string;
  /** What covers it, such as `line:serve`, `node:barista` or `step:serve`. */
  b: string;
  band: Exclude<Band, "clear">;
  /** Gap in em of arrow-label text; negative when the two overlap. */
  gap: number;
}

/**
 * Separate facts about a drawn map. They are not a score: hard defects
 * decide first, then the author's eye.
 */
export interface LayoutReport {
  /** Independent verdicts for required map constraints. */
  constraints: ConstraintVerdict[];
  /** Hard contacts plus broken required constraints. */
  hard: number;
  /** Places where two arrows pass through each other. */
  crossings: { count: number; pairs: [string, string][] };
  /** Arrow labels covered by other labels, lines or boxes. */
  labels: { labels: Contact[]; lines: Contact[]; boxes: Contact[] };
  /** Step numbers over labels, boxes or each other. */
  steps: { labels: Contact[]; boxes: Contact[]; steps: Contact[] };
  /** Arrows, loops included, that pass over a box they do not connect. */
  lines: { boxes: Contact[] };
  /**
   * Arrows of the first scenario that go in the reading direction (down or
   * right): its flow, or the arrows of its steps when it has no flow. Loops on
   * one box are not counted. `share` is null when there is no arrow to judge.
   */
  reading: Reading;
  /** Size of the drawing in em of arrow-label text, at the text's own size. */
  text: { width: number; height: number };
}

export interface CheckOptions {
  /** Text measurement; the built-in font table by default. */
  measureLabel?: LabelMeasurer;
  /** Font size of arrow labels in map units; every threshold is relative to it. */
  textSize?: number;
  /** Minimum clear gap, in em. Default 0.25. */
  margin?: number;
  /** Largest overlap that is still `tight`, in em. Default 0.1. */
  tolerance?: number;
}
