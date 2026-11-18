import type { ResolvedMap } from "../../schema.js";
import type { LayoutReport } from "./quality.js";

/** Keep fixed geometry readable by moving conflicting arrow text to the panel. */
export function labelsInPanel(
  map: ResolvedMap,
  report: Pick<LayoutReport, "labels" | "steps">,
): boolean {
  const labelled = new Set(
    Object.entries(map.edges)
      .filter(([, edge]) => edge.label?.text)
      .map(([id]) => `label:${id}`),
  );
  const conflict = [
    ...report.labels.labels,
    ...report.labels.lines,
    ...report.labels.boxes,
    ...report.steps.labels,
  ].some(
    (contact) =>
      contact.band === "defect" &&
      (labelled.has(contact.a) || labelled.has(contact.b)),
  );
  return (
    choosePresentation({ wide: { hard: Number(conflict) } }, 0).presentation ===
    "panel"
  );
}

/** Internal choice state; widths are in em of the drawn arrow-label text. */
export interface PresentationChoice {
  presentation: "wide" | "narrow" | "panel";
  switchedAt?: number;
}

/**
 * Prefer clean wide geometry, then clean narrow geometry, then panel labels.
 * Omit narrow for hand drawings: they must never be laid out again.
 * The panel is a fallback, not a claim that non-label defects are repaired;
 * its visible geometry still needs an independent check.
 * Retain the first switch width until wide is clean and at least 1 em wider.
 */
export function choosePresentation(
  reports: {
    wide: Pick<LayoutReport, "hard">;
    narrow?: Pick<LayoutReport, "hard">;
  },
  width: number,
  switchedAt?: number,
): PresentationChoice {
  if (
    reports.wide.hard === 0 &&
    (switchedAt === undefined || width >= switchedAt + 1)
  )
    return { presentation: "wide", switchedAt: undefined };
  return {
    presentation: reports.narrow?.hard === 0 ? "narrow" : "panel",
    switchedAt: switchedAt ?? width,
  };
}
