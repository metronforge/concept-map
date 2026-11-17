import type { ResolvedMap } from "../../schema.js";
import type { LayoutReport } from "./quality.js";

/** Keep fixed geometry readable by moving conflicting arrow text to the panel. */
export function labelsInPanel(map: ResolvedMap, report: LayoutReport): boolean {
  const labelled = new Set(
    Object.entries(map.edges)
      .filter(([, edge]) => edge.label?.text)
      .map(([id]) => `label:${id}`),
  );
  return [
    ...report.labels.labels,
    ...report.labels.lines,
    ...report.labels.boxes,
    ...report.steps.labels,
  ].some(
    (contact) =>
      contact.band === "defect" &&
      (labelled.has(contact.a) || labelled.has(contact.b)),
  );
}
