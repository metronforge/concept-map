import type { ResolvedMap } from "../../schema.js";
import type { Measurer } from "../ports.js";
import { measured } from "../measured.js";
import type { LabelStyle } from "../types.js";
import { checkLabels } from "./label-check.js";

/** Checker IDs eligible to stay at their re-measured positions. */
export function fixedAnnotations(map: ResolvedMap, measurer: Measurer) {
  const report = checkLabels(map, map, {
    measureLabel: (text, style) => paintedSize(measurer, text, style),
  });
  const touching = new Set(
    Object.values(report).flatMap((group) =>
      Object.values(group).flatMap((contacts) =>
        contacts.flatMap(({ a, b }) => [a, b]),
      ),
    ),
  );
  const ids = Object.entries(map.edges).flatMap(([id, edge]) => [
    ...(edge.label ? [`label:${id}`] : []),
    ...(edge.badge ? [`step:${id}`] : []),
  ]);
  for (const [i, scenario] of map.scenarios.entries())
    for (const repeat of scenario.repeatBadges ?? [])
      ids.push(`repeat:${i}:${repeat.step}`);
  return new Set(ids.filter((id) => !touching.has(id)));
}

/** Include the painted halo without changing checker thresholds or metadata. */
function paintedSize(measurer: Measurer, text: string, style: LabelStyle) {
  const size = measured(measurer.measure.bind(measurer), text, style);
  const padding = size.padding ?? 0;
  return {
    ...size,
    left: (size.left ?? 0) - padding,
    ascent: (size.ascent ?? (size.height * 5) / 6) + padding,
    width: size.width + 2 * padding,
    height: size.height + 2 * padding,
  };
}
