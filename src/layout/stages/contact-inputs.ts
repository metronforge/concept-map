import type { ResolvedMap, SourceMap } from "../../schema.js";
import { measureMono } from "../text-size.js";
import { drawn, TEXT } from "./drawn.js";
import type { CheckOptions } from "./quality.js";
import { judgeContacts } from "./uncertainty.js";

/** Shapes and the contact judge shared by the full check and the label check. */
export function contactInputs(
  source: SourceMap | ResolvedMap,
  resolved: ResolvedMap,
  options: CheckOptions,
) {
  const size = options.textSize ?? TEXT;
  const margin = (options.margin ?? 0.25) * size;
  const tolerance = (options.tolerance ?? 0.1) * size;
  const input = options.measureLabel;
  const measure = !input
    ? measureMono
    : typeof input === "function"
      ? input
      : input.measure.bind(input);
  const shapes = drawn(source, resolved, size, measure);
  return {
    size,
    tolerance,
    shapes,
    judge: judgeContacts(shapes, size, margin, tolerance),
  };
}
