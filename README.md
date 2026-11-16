# Coffee shop: a map you can play

Follow guest → cashier → barista, then switch from **Normal** to **Out of milk**.
[Open the coffee shop](https://metronforge.github.io/concept-map/examples/coffee/)
or copy its [HTML and JSON](examples/coffee/).

Save this source map as `map.json`. There are no coordinates:

<!-- prettier-ignore -->
```json
{
  "format": 3, "id": "coffee", "title": "Coffee shop", "direction": "right",
  "layers": {"process": {"label": "Process"}},
  "nodes": {
    "guest": {"label": "Guest", "layer": "process"},
    "cashier": {"label": "Cashier", "layer": "process"},
    "barista": {"label": "Barista", "layer": "process"}
  },
  "edges": {
    "order": {"from": "guest", "to": "cashier", "label": "Order"},
    "ticket": {"from": "cashier", "to": "barista", "label": "Make coffee"},
    "ready": {"from": "barista", "to": "guest", "label": "Coffee ready"},
    "empty": {"from": "barista", "to": "cashier", "label": "Out of milk"},
    "offer": {"from": "cashier", "to": "guest", "label": "Offer americano"}
  },
  "scenarios": [
    {
      "id": "normal", "label": "Normal",
      "steps": [
        {"id": "order", "title": "Place an order", "text": "The guest orders a coffee.", "show": ["guest", "cashier"], "current": ["cashier"], "edges": ["order"]},
        {"id": "brew", "title": "Make coffee", "text": "The cashier sends the order to the barista.", "show": ["barista"], "current": ["barista"], "edges": ["ticket"]},
        {"id": "serve", "title": "Serve coffee", "text": "The guest receives the coffee.", "show": [], "current": ["guest"], "edges": ["ready"]}
      ],
      "flow": [{"node": "guest", "step": "order", "log": []}, {"node": "cashier", "step": "order", "log": ["Order received."], "edge": "order"}, {"node": "barista", "step": "brew", "log": ["Making coffee."], "edge": "ticket"}, {"node": "guest", "step": "serve", "log": ["Coffee served."], "edge": "ready"}]
    },
    {
      "id": "out-of-milk", "label": "Out of milk",
      "steps": [
        {"id": "order", "title": "Order a cappuccino", "text": "The barista receives an order for a cappuccino.", "show": ["guest", "cashier", "barista"], "current": ["barista"], "edges": ["order", "ticket"]},
        {"id": "empty", "title": "Check the milk", "text": "The barista tells the cashier there is no milk.", "show": [], "current": ["barista"], "edges": ["empty"]},
        {"id": "offer", "title": "Offer an alternative", "text": "The cashier offers an americano.", "show": [], "current": ["guest"], "edges": ["offer"]}
      ],
      "flow": [{"node": "guest", "step": "order", "log": []}, {"node": "cashier", "step": "order", "log": [], "edge": "order"}, {"node": "barista", "step": "order", "log": [], "edge": "ticket"}, {"node": "cashier", "step": "empty", "log": ["No milk left."], "edge": "empty"}, {"node": "guest", "step": "offer", "log": ["Offer an americano."], "edge": "offer"}]
    }
  ]
}
```

Load the stylesheet, one module script and one element on an HTML page:

```html
<link
  rel="stylesheet"
  href="https://esm.sh/@metronforge/concept-map@0.2.0/css"
/>
<script
  type="module"
  src="https://esm.sh/@metronforge/concept-map@0.2.0/element"
></script>
<concept-map src="./map.json" layout="dagre"></concept-map>
```

Serve the files over HTTP, for example with `python3 -m http.server 8000`.
The [complete page](examples/coffee/index.html) adds a title, navigation and host styling.
The element fetches the JSON, loads dagre when needed and provides scenarios,
steps, an animated whole-map flow, keyboard controls and reduced-motion support.
Ready maps with geometry do not download a layout engine.

## Three ways to use the package

1. **Plain HTML:** use `<concept-map>` as above. It also accepts inline JSON or
   a `map` property and can hydrate server-rendered figures. Select `layout="elk"`
   for ELK, or supply an `element.layout` function.
2. **Browser code:** `mount(element, resolvedMap)` from `@metronforge/concept-map/dom`
   renders an empty host or hydrates matching markup and returns a player.
   Call `player.destroy()` when removing the host.
3. **Server rendering:** `renderFigure(resolvedMap)` from `@metronforge/concept-map`
   returns complete figure markup. Mount it in the browser to add interaction.

The last two accept resolved maps. For source maps, call `layout(source, engine)`
from `@metronforge/concept-map/layout` first. See [integration](docs/INTEGRATION.md)
and [automatic layout](docs/LAYOUT.md).

## Lay out on the server

Install the optional engine with `npm install @dagrejs/dagre`. Read the source
map, resolve its geometry, then render the complete figure:

```js
import { readFile } from "node:fs/promises";
import { layout } from "@metronforge/concept-map/layout";
import { dagreEngine } from "@metronforge/concept-map/layout/dagre";
import { renderFigure } from "@metronforge/concept-map";

const map = JSON.parse(await readFile("map.json", "utf8"));
const resolvedMap = await layout(map, dagreEngine);
const html = renderFigure(resolvedMap);
```

`dagreEngine` is an object, not a function: pass it directly to `layout`, without
calling it. Include `html` in the server response and load the package stylesheet.
Use `mount` in the browser to add interaction.

## More examples

- [Door: a finite state machine](https://metronforge.github.io/concept-map/examples/door/) —
  states, guarded transition labels and a self-transition. [Authoring notes](examples/door/README.md).
- [Euclid's algorithm](https://metronforge.github.io/concept-map/examples/gcd/) —
  a recorded loop with repeat badges and values in the log. [Authoring notes](examples/gcd/README.md).
- [Layout comparison](https://metronforge.github.io/concept-map/) —
  manual geometry, dagre and ELK side by side.

Each example is a standalone HTML page plus a source JSON file. Its README records
what the author had to work around; these notes inform the next release.

## Install and style

```sh
npm install @metronforge/concept-map zod
```

ESM only, Node ≥ 22.14. `zod` 4 is a peer dependency. MIT.
Install `@dagrejs/dagre` or `elkjs` when a bundled application uses that engine.
Load `@metronforge/concept-map/css` separately; host colours and fonts use the
custom properties in [docs/CSS.md](docs/CSS.md).

## Format 3

Maps declare their own layers and use plain text with inline code, emphasis and
strong marks. HTML is escaped. `SourceMapSchema` validates maps without geometry;
`ResolvedMapSchema` validates geometry for playback. `layout()` checks semantic
references before running an engine. See the [format guide](docs/FORMAT.md).

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
