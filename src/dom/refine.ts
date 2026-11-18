import type { ResolvedMap } from "../schema.js";
import { checkLabels } from "../layout/stages/label-check.js";
import { chooseLabelPresentation } from "../layout/stages/presentation.js";
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
  switchedAt?: number,
) {
  sizeLabels(root, map, geo, true);
  const result = refine(map, domMeasurer(root));
  for (const [id, edge] of Object.entries(result.edges)) {
    if (!edge.label) continue;
    svg.labels[id].setAttribute("x", String(edge.label.at[0]));
    svg.labels[id].setAttribute("y", String(edge.label.at[1]));
  }
  sizeLabels(root, result, geo);
  const width = containerWidthEm(root, svg.svg, result);
  const choice = chooseLabelPresentation(
    result,
    checkLabels(map, result, { measureLabel: domMeasurer(root) }),
    width ?? 0,
    switchedAt,
  );
  // A hidden container has no useful width and must not start a resize cycle.
  if (width === undefined) choice.switchedAt = switchedAt;
  svg.applyFrame(
    derive(result, state, { labelsInPanel: choice.presentation === "panel" }),
  );
  return { map: result, choice };
}

/** Container content width in em of arrow text at the drawing's actual scale. */
function containerWidthEm(
  root: HTMLElement,
  svg: SVGSVGElement,
  map: ResolvedMap,
): number | undefined {
  const label = svg.querySelector<SVGTextElement>(".etext");
  if (!label || !svg.clientWidth) return undefined;
  const view = root.ownerDocument.defaultView!;
  const container = svg.parentElement!;
  const css = view.getComputedStyle(container);
  const width =
    container.clientWidth -
    parseFloat(css.paddingLeft) -
    parseFloat(css.paddingRight);
  const em =
    (parseFloat(view.getComputedStyle(label).fontSize) * svg.clientWidth) /
    map.viewBox[0];
  return width > 0 && em > 0 ? width / em : undefined;
}
