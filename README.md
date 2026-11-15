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

Render a complete figure on the server:

```js
import { ResolvedMapSchema, renderFigure } from "@metronforge/concept-map";
const map = ResolvedMapSchema.parse(data);
const html = renderFigure(map, { id: "coffee" });
```

In the browser, mount a map into an empty host or hydrate its existing figure:

```js
import { mount } from "@metronforge/concept-map/dom";
import "@metronforge/concept-map/css";
const player = mount(document.querySelector("#map-host"), map);
// player.destroy() when the host is removed
```

Or import `@metronforge/concept-map/element` and use
`<concept-map src="coffee.json"></concept-map>`. The element also accepts inline
JSON or a `map` property and upgrades server-rendered figures in place.
See [integration and import migration](docs/INTEGRATION.md) for all three ways,
input precedence, lifecycle, errors and explicit source-map layout.

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

| Entry                                               | Contents                                         |
| --------------------------------------------------- | ------------------------------------------------ |
| `@metronforge/concept-map`                          | schemas, model and server renderers              |
| `@metronforge/concept-map/dom`                      | `mount`, `MapPlayer`, concepts and browser ports |
| `@metronforge/concept-map/element`                  | registers `<concept-map>`                        |
| `@metronforge/concept-map/css`                      | the player stylesheet                            |
| `@metronforge/concept-map/source-map.schema.json`   | JSON Schema of the source map                    |
| `@metronforge/concept-map/resolved-map.schema.json` | JSON Schema of the resolved map                  |

## Links

[Changelog](CHANGELOG.md) · [Contributing](CONTRIBUTING.md) ·
[Releasing](RELEASING.md) · [Roadmap](docs/ROADMAP.md)
