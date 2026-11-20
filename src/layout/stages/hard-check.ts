import type { ResolvedMap, SourceMap } from "../../schema.js";
import { checkConstraints } from "./constraints.js";
import { contactInputs } from "./contact-inputs.js";
import { labelContacts, lineContacts, stepContacts } from "./contacts.js";
import type { CheckOptions, LayoutReport } from "./quality.js";

type HardReport = Pick<
  LayoutReport,
  "hard" | "constraints" | "labels" | "steps" | "lines"
>;

/** The complete hard-defect check without descriptive crossing/reading metrics. */
export function checkHard(
  source: SourceMap | ResolvedMap,
  resolved: ResolvedMap,
  options: CheckOptions = {},
): HardReport {
  return hardReport(source, resolved, contactInputs(source, resolved, options));
}

export function hardReport(
  source: SourceMap | ResolvedMap,
  resolved: ResolvedMap,
  { shapes, judge }: Pick<ReturnType<typeof contactInputs>, "shapes" | "judge">,
): HardReport {
  const report: HardReport = {
    hard: 0,
    constraints: checkConstraints(source, resolved),
    labels: labelContacts(shapes, judge),
    steps: stepContacts(shapes, judge),
    lines: lineContacts(shapes, judge),
  };
  report.hard =
    contactLists(report)
      .flat()
      .filter((c) => c.band === "defect").length +
    report.constraints.filter(
      (c) => c.strength === "required" && c.holds === false,
    ).length;
  return report;
}

/** Contact groups in the order used by full-report diagnostics. */
export function contactLists(report: HardReport) {
  return [
    report.labels.labels,
    report.labels.lines,
    report.labels.boxes,
    report.steps.labels,
    report.steps.boxes,
    report.steps.steps,
    report.lines.boxes,
  ];
}
