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

## Format 3

Maps declare their own layers and use `id` instead of `spread`. Text fields are
plain text with inline code, emphasis and strong marks; the renderers escape
HTML. [Format and migration guide](docs/FORMAT.md).

`SourceMapSchema` accepts maps without coordinates. `ResolvedMapSchema` requires
geometry for playback. See [automatic layout](docs/LAYOUT.md) for source maps; supply resolved
geometry for now. Parse maps to apply optional-field defaults. Layer references
are checked, but other cross-references and URL policy remain the host adapter's
responsibility.

## Stability

Before 1.0 any minor version may change the API. The data format has its own
number (`format: 3`); format 2 is no longer accepted. The planned
changes are in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) and
[docs/DEBT.md](docs/DEBT.md).

## Exports

| Entry                                               | Contents                                     |
| --------------------------------------------------- | -------------------------------------------- |
| `@metronforge/concept-map`                          | schema, model, renderers and the `MapPlayer` |
| `@metronforge/concept-map/css`                      | the player stylesheet                        |
| `@metronforge/concept-map/source-map.schema.json`   | JSON Schema of the source map                |
| `@metronforge/concept-map/resolved-map.schema.json` | JSON Schema of the resolved map              |

## Links

[Changelog](CHANGELOG.md) · [Contributing](CONTRIBUTING.md) ·
[Releasing](RELEASING.md) · [Roadmap](docs/ROADMAP.md)
