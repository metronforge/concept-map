import type { ResolvedMap, SourceMap } from "../../schema.js";
import { contactInputs } from "./contact-inputs.js";
import { labelContacts, stepContacts } from "./contacts.js";
import type { CheckOptions, LayoutReport } from "./quality.js";

/**
 * The part of `check` that concerns text: arrow labels and step numbers. Same
 * shapes, thresholds and bands as `check`, without lanes, crossings or reading
 * direction, so a browser that only decides where labels go stays small.
 */
export function checkLabels(
  source: SourceMap | ResolvedMap,
  resolved: ResolvedMap,
  options: CheckOptions = {},
): Pick<LayoutReport, "labels" | "steps"> {
  const { shapes, judge } = contactInputs(source, resolved, options);
  return {
    labels: labelContacts(shapes, judge),
    steps: stepContacts(shapes, judge),
  };
}
