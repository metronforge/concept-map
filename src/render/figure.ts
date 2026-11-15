import type { ResolvedMap } from "../schema.js";
import { derive } from "../model/frame.js";
import { initialState } from "../model/state.js";
import { renderSvg } from "./svg.js";
import { renderPanelParts, statusText, type UiStrings } from "./panel.js";
import { renderConcepts, renderDeeper } from "./concepts.js";
import { escapeHtml as esc } from "./inline.js";

export interface FigureOptions {
  /** Unique document id, also used for the server-rendered SVG marker. */
  id?: string;
  strings?: Partial<UiStrings>;
}

/** Complete light-DOM figure, including the data needed to hydrate it. */
export function renderFigure(
  map: ResolvedMap,
  options: FigureOptions = {},
): string {
  const frame = derive(map, initialState);
  const panel = renderPanelParts(map, frame, options.strings);
  const id = options.id ? ` id="${esc(options.id)}"` : "";
  const scenarios = map.scenarios
    .map(
      (s, i) =>
        `<button type="button" data-scenario="${esc(s.id)}" aria-pressed="${i === 0}">${esc(s.label)}</button>`,
    )
    .join("");
  const svg = renderSvg(map, {
    frame,
    markerId: options.id ? `${options.id}-arrow` : undefined,
  });
  const data = JSON.stringify(map).replaceAll("<", "\\u003c");
  return `<figure class="map-figure map-ui"${id} data-figure="map" data-map-id="${esc(map.id)}" tabindex="0" aria-label="${esc(map.title)}"><section aria-label="Concept map"><div class="bar"><div class="seg scenarios" role="group" aria-label="Scenario" data-role="scenarios">${scenarios}</div><div class="seg" role="group" aria-label="View"><button type="button" data-mode="step" aria-pressed="true">Step by step</button><button type="button" data-mode="all" aria-pressed="false">Whole map</button></div></div><div class="map">${svg}</div></section><p class="map-status" role="status" data-map-status>${esc(statusText(frame))}</p><div class="panel head" data-role="panel">${panel.head}</div><div class="panel more" data-role="more">${panel.more}</div><div data-map-concepts>${renderConcepts(map)}</div>${renderDeeper(map)}<script type="application/json" data-map-data>${data}</script></figure>`;
}
