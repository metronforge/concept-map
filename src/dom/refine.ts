import type { ResolvedMap } from "../schema.js";
import { checkLabels } from "../layout/stages/label-check.js";
import {
  chooseLabelPresentation,
  choosePresentation,
} from "../layout/stages/presentation.js";
import { checkHard } from "../layout/stages/hard-check.js";
import { refine } from "../layout/stages/refine.js";
import { domMeasurer } from "./measureLabel.js";
import { sizeLabels, type Geometry } from "./geometry.js";
import { derive } from "../model/frame.js";
import type { PlayerState } from "../model/state.js";
import type { SvgDom } from "./svgDom.js";

/** Fit the wide drawing, or compare it with a supplied layout of the same map.
 * Callers supply narrow geometry only for automatically laid-out maps. */
export function refineDrawing(
  root: HTMLElement,
  map: ResolvedMap,
  geo: Geometry,
  svg: SvgDom,
  state: PlayerState,
  switchedAt?: number,
  narrow?: ResolvedMap | ((widthEm: number) => ResolvedMap | undefined),
) {
  const wide = fitDrawing(root, map, geo, svg);
  const width = containerWidthEm(root, svg.svg, wide);
  const result = narrow
    ? fitCandidates(root, wide, narrow, geo, svg, width ?? 0, switchedAt)
    : {
        map: wide,
        choice: chooseLabelPresentation(
          wide,
          checkLabels(map, wide, { measureLabel: domMeasurer(root) }),
          width ?? 0,
          switchedAt,
        ),
      };
  // A hidden container has no useful width and must not start a resize cycle.
  if (width === undefined) result.choice.switchedAt = switchedAt;
  svg.applyFrame(
    derive(result.map, state, {
      labelsInPanel: result.choice.presentation === "panel",
    }),
  );
  return result;
}

function fitDrawing(
  root: HTMLElement,
  map: ResolvedMap,
  geo: Geometry,
  svg: SvgDom,
): ResolvedMap {
  svg.applyGeometry(map);
  sizeLabels(root, map, geo, true);
  const result = refine(map, domMeasurer(root));
  svg.applyGeometry(result);
  sizeLabels(root, result, geo);
  return result;
}

function fitCandidates(
  root: HTMLElement,
  wide: ResolvedMap,
  narrow: ResolvedMap | ((widthEm: number) => ResolvedMap | undefined),
  geo: Geometry,
  svg: SvgDom,
  width: number,
  switchedAt?: number,
) {
  const reports = {
    wide: checkHard(wide, wide, { measureLabel: domMeasurer(root) }),
  };
  let choice = choosePresentation(reports, width, switchedAt);
  if (choice.presentation === "wide") return { map: wide, choice };
  const candidate =
    typeof narrow === "function"
      ? width > 0
        ? narrow(width)
        : undefined
      : narrow;
  if (!candidate) return { map: wide, choice };
  const fitted = fitDrawing(root, candidate, geo, svg);
  choice = choosePresentation(
    {
      ...reports,
      narrow: checkHard(wide, fitted, { measureLabel: domMeasurer(root) }),
    },
    width,
    switchedAt,
  );
  const map = choice.presentation === "narrow" ? fitted : wide;
  // Probes share the live SVG; restore the selected candidate before paint.
  svg.applyGeometry(map);
  sizeLabels(root, map, geo);
  return { map, choice };
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
