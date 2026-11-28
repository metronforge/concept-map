import type { ResolvedMap } from "../../schema.js";
import type { Measurer } from "../ports.js";
import type { LabelSize, LayoutPoint } from "../types.js";
import { measured } from "../measured.js";
import { placeAnnotations } from "./placement.js";
import { fixedAnnotations } from "./fixed-annotations.js";
const style = { fontSize: 10.5, mono: true };

function labels(map: ResolvedMap, measurer: Measurer) {
  const sizes: Record<string, LabelSize> = {};
  const edges = Object.fromEntries(
    Object.entries(map.edges).map(([id, edge]) => {
      if (!edge.label) return [id, edge];
      const size = measured(measurer.measure.bind(measurer), edge.label.text, {
        ...style,
        edge: id,
      });
      const previous = map.measurement?.labels[id] ?? size;
      const [x, y] = edge.label.at;
      const at: LayoutPoint = [
        x +
          ((previous.left ?? 0) - (size.left ?? 0)) +
          (previous.width - size.width) / 2,
        y +
          ((size.ascent ?? (size.height * 5) / 6) -
            (previous.ascent ?? (previous.height * 5) / 6)) +
          (previous.height - size.height) / 2,
      ];
      sizes[id] = size;
      return [id, { ...edge, label: { ...edge.label, at } }];
    }),
  );
  return { sizes, edges };
}

/** Re-measure text and place labels and numbers, keeping all fixed geometry.
 * Authored anchors stay put until a previous measurement is available.
 * No input is mutated; the checker measures independently of this metadata. */
export function refine(map: ResolvedMap, measurer: Measurer): ResolvedMap {
  const text = labels(map, measurer);
  const measuredMap = {
    ...map,
    measurement: { name: measurer.name, labels: text.sizes },
    edges: text.edges,
  };
  return placeAnnotations(measuredMap, fixedAnnotations(measuredMap, measurer));
}
