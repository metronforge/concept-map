import type { ResolvedMap, SourceMap } from "../../schema.js";
import { contactInputs } from "./contact-inputs.js";
import { crossingPairs } from "./contacts.js";
import { hardReport, contactLists } from "./hard-check.js";
import { reading } from "./reading.js";
import type { CheckOptions, LayoutReport } from "./quality.js";
export type { Band, CheckOptions, Contact, LayoutReport } from "./quality.js";

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
  const { size, tolerance, shapes, judge } = contactInputs(
    source,
    resolved,
    options,
  );
  return {
    ...hardReport(source, resolved, { shapes, judge }),
    crossings: crossingPairs(shapes),
    reading: reading(source, resolved, tolerance),
    text: {
      width: Math.round((resolved.viewBox[0] / size) * 100) / 100,
      height: Math.round((resolved.viewBox[1] / size) * 100) / 100,
    },
  };
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
