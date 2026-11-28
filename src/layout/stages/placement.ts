import type { ResolvedMap } from "../../schema.js";
import { placeNumbers } from "./number-placement.js";
import { placeLabels } from "./label-placement.js";

/** Shared placement; fixed IDs use the checker’s label/step/repeat names. */
export function placeAnnotations(
  map: ResolvedMap,
  fixed: ReadonlySet<string> = new Set(),
): ResolvedMap {
  return placeLabels(placeNumbers(map, fixed), fixed);
}
