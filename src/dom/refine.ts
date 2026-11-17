import type { ResolvedMap } from "../schema.js";
import { check } from "../layout/stages/report.js";
import { labelsInPanel } from "../layout/stages/presentation.js";
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
): { map: ResolvedMap; labelsInPanel: boolean } {
  sizeLabels(root, map, geo, true);
  const result = refine(map, domMeasurer(root));
  for (const [id, edge] of Object.entries(result.edges)) {
    if (!edge.label) continue;
    svg.labels[id].setAttribute("x", String(edge.label.at[0]));
    svg.labels[id].setAttribute("y", String(edge.label.at[1]));
  }
  sizeLabels(root, result, geo);
  const panel = labelsInPanel(
    result,
    check(map, result, { measureLabel: domMeasurer(root) }),
  );
  svg.applyFrame(derive(result, state, { labelsInPanel: panel }));
  return { map: result, labelsInPanel: panel };
}
