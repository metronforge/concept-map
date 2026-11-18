import type { ResolvedMap, SourceMap } from "../../schema.js";
import { checkConstraints } from "./constraints.js";
import { contactInputs } from "./contact-inputs.js";
import { labelContacts, lineContacts, stepContacts } from "./contacts.js";
import type { CheckOptions, Contact, LayoutReport } from "./quality.js";

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
      .flatMap(([, list]) => list)
      .filter((c) => c.band === "defect").length +
    report.constraints.filter((c) => !c.holds).length;
  return report;
}

/** Every contact list of a report, named in words. */
export function contactLists(report: HardReport): [string, Contact[]][] {
  return [
    ["arrow labels overlap", report.labels.labels],
    ["a line crosses an arrow label", report.labels.lines],
    ["an arrow label covers a box", report.labels.boxes],
    ["a step number covers an arrow label", report.steps.labels],
    ["a step number covers a box", report.steps.boxes],
    ["step numbers overlap", report.steps.steps],
    ["a line passes over a box", report.lines.boxes],
  ];
}
