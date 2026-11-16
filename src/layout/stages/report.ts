import { checkConstraints } from "./constraints.js";
import type { ResolvedMap, SourceMap } from "../../schema.js";
import { asMeasurer } from "../measure.js";
import { drawn, TEXT } from "./drawn.js";
import {
  crossingPairs,
  labelContacts,
  lineContacts,
  stepContacts,
  type Judge,
} from "./contacts.js";
import { reading } from "./reading.js";
import type { CheckOptions, Contact, LayoutReport } from "./quality.js";
export type { Band, CheckOptions, Contact, LayoutReport } from "./quality.js";

const round = (n: number) => Math.round(n * 1000) / 1000;

/**
 * Judge a resolved map, whoever drew it: an engine, a hand drawing or an
 * edited file. Reads only the source map and the resolved geometry, never what
 * a layout engine said about its result. The same function serves `layout`
 * with `strict` and the comparison page.
 */
export function check(
  source: SourceMap | ResolvedMap,
  resolved: ResolvedMap,
  options: CheckOptions = {},
): LayoutReport {
  const size = options.textSize ?? TEXT;
  const margin = (options.margin ?? 0.25) * size;
  const tolerance = (options.tolerance ?? 0.1) * size;
  const measurer = asMeasurer(options.measureLabel);
  const shapes = drawn(source, resolved, size, measurer.measure.bind(measurer));
  const judge: Judge = (list, a, b, gap) => {
    if (gap >= margin) return;
    const band = gap < -tolerance ? "defect" : "tight";
    list.push({ a, b, band, gap: round(gap / size) });
  };
  const report: LayoutReport = {
    hard: 0,
    constraints: checkConstraints(source, resolved),
    crossings: crossingPairs(shapes),
    labels: labelContacts(shapes, judge),
    steps: stepContacts(shapes, judge),
    lines: lineContacts(shapes, judge),
    reading: reading(source, resolved, tolerance),
    text: {
      width: Math.round((resolved.viewBox[0] / size) * 100) / 100,
      height: Math.round((resolved.viewBox[1] / size) * 100) / 100,
    },
  };
  report.hard =
    contactLists(report)
      .flatMap(([, list]) => list)
      .filter((c) => c.band === "defect").length +
    report.constraints.filter((c) => !c.holds).length;
  return report;
}

/** Every contact list of a report, named in words. */
function contactLists(report: LayoutReport): [string, Contact[]][] {
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

/** List the hard defects of a report in words, one per line. */
export function describeDefects(report: LayoutReport): string[] {
  return report.constraints
    .filter((c) => !c.holds)
    .map((c) => c.message)
    .concat(
      contactLists(report).flatMap(([what, list]) =>
        list
          .filter((c) => c.band === "defect")
          .map((c) => `${what}: ${c.a} and ${c.b} (${-c.gap} em)`),
      ),
    );
}
