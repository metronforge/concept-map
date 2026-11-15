# @metronforge/concept-map

Concept maps that are rendered to SVG on the server and played step by step in
the browser: scenarios, steps, a "whole map" mode with an animated flow,
keyboard control, screen-reader status and reduced-motion support.

Made for the book _The Illustrated Playwright_; usable anywhere.

```sh
npm install @metronforge/concept-map zod
```

ESM only, Node ≥ 22.14. `zod` 4 is a peer dependency. MIT.

## Use

On the server, render the figure from a resolved map:

```js
import {
  ResolvedMapSchema,
  derive,
  initialState,
  renderSvg,
  renderPanelParts,
} from "@metronforge/concept-map";

const map = ResolvedMapSchema.parse(resolvedMap);
const frame = derive(map, initialState);
const svg = renderSvg(map, { frame, markerId: "map-arrow" });
const panel = renderPanelParts(map, frame); // { head, more }
```

Put `svg` and the panel into the figure markup described in
[docs/DOM.md](docs/DOM.md), and embed the map as JSON
(`JSON.stringify(map).replaceAll("<", "\\u003c")`).

In the browser, start the player:

```js
import { MapPlayer } from "@metronforge/concept-map";
import "@metronforge/concept-map/css";

const root = document.querySelector('[data-figure="map"]');
const map = JSON.parse(root.querySelector("[data-map-data]").textContent);
const player = new MapPlayer(root, map);
// player.destroy() when the figure is removed
```

Colours and fonts come from custom properties, listed in
[docs/CSS.md](docs/CSS.md):

```css
.map-ui {
  --cmap-bg: white;
  --cmap-fg: #202124;
  --cmap-accent: #285bb5;
}
```

A complete page is in [`scripts/build-demo.mjs`](scripts/build-demo.mjs).

## Trusted input only

Text fields of a resolved map (step text, definitions, notes) are HTML and are
inserted as is. Build maps with your own adapter from content you control; do
not pass JSON from users or other sites. The schema checks structure, not
references between nodes or HTML safety.

## Stability

Before 1.0 any minor version may change the API. The data format has its own
number (`format: 2`); the layer names are still those of the book. The planned
changes are in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) and
[docs/DEBT.md](docs/DEBT.md).

## Exports

| Entry                                               | Contents                                     |
| --------------------------------------------------- | -------------------------------------------- |
| `@metronforge/concept-map`                          | schema, model, renderers and the `MapPlayer` |
| `@metronforge/concept-map/css`                      | the player stylesheet                        |
| `@metronforge/concept-map/resolved-map.schema.json` | JSON Schema of the resolved map              |

## Links

[Changelog](CHANGELOG.md) · [Contributing](CONTRIBUTING.md) ·
[Releasing](RELEASING.md)
