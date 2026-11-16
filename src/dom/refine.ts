import type { ResolvedMap } from "../schema.js";
import { refine } from "../layout/stages/refine.js";
import { domMeasurer } from "./measureLabel.js";
import { sizeLabels, type Geometry } from "./geometry.js";
import { derive } from "../model/frame.js";
import type { PlayerState } from "../model/state.js";
import type { SvgDom } from "./svgDom.js";

/** Browser measurements in, resolved geometry out; no placement decisions here. */
export function refineDrawing(
  root: HTMLElement,
  map: ResolvedMap,
  geo: Geometry,
  svg: SvgDom,
  state: PlayerState,
): ResolvedMap {
  sizeLabels(root, map, geo, true);
  const result = refine(map, domMeasurer(root));
  for (const [id, edge] of Object.entries(result.edges)) {
    if (!edge.label) continue;
    svg.labels[id].setAttribute("x", String(edge.label.at[0]));
    svg.labels[id].setAttribute("y", String(edge.label.at[1]));
  }
  svg.applyFrame(derive(result, state));
  sizeLabels(root, result, geo);
  return result;
}
