import { canHydrate } from "../render/hydration.js";
import type { ResolvedMap } from "../schema.js";
import { renderFigure, type FigureOptions } from "../render/figure.js";
import { MapPlayer, connectConcepts } from "./player.js";

export type MountOptions = FigureOptions &
  ConstructorParameters<typeof MapPlayer>[2];
const mounted = new WeakMap<HTMLElement, MapPlayer>();

/** Populate a host or hydrate its existing figure. Repeated mounts replace bindings. */
export function mount(
  element: HTMLElement,
  map: ResolvedMap,
  options: MountOptions = {},
): MapPlayer {
  const existing = element.matches('figure[data-figure="map"]')
    ? element
    : element.querySelector<HTMLElement>(':scope > figure[data-figure="map"]');
  mounted.get(element)?.destroy();
  if (existing) mounted.get(existing)?.destroy();
  const markup = renderFigure(map, options);
  let root = existing;
  const data = root?.querySelector(":scope > script[data-map-data]");
  if (!root || !canHydrate(data ? (data.textContent ?? "") : undefined, map)) {
    if (existing === element) {
      const template = element.ownerDocument.createElement("template");
      template.innerHTML = markup;
      const figure = template.content.firstElementChild!;
      for (const attr of [...figure.attributes])
        element.setAttribute(attr.name, attr.value);
      element.innerHTML = figure.innerHTML;
      root = element;
    } else {
      element.innerHTML = markup;
      root = element.firstElementChild as HTMLElement;
    }
  }
  const player = new MapPlayer(root, map, options);
  connectConcepts(
    player,
    root.querySelector<HTMLElement>("[data-map-concepts]") ?? root,
  );
  mounted.set(element, player);
  mounted.set(root, player);
  return player;
}
