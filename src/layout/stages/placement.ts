import type { ResolvedMap } from "../../schema.js";
import { placeNumbers } from "./number-placement.js";
import { placeLabels } from "./label-placement.js";

/** Shared annotation placement for layout and real-font refinement. */
export function placeAnnotations(map: ResolvedMap): ResolvedMap {
  return placeLabels(placeNumbers(map));
}
