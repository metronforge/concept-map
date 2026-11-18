# Use a map without a framework

All three ways use the same light-DOM figure, controls and player. Load the
package stylesheet once. The host can override the `--cmap-*` properties.
No framework is loaded. A layout engine loads only for a source map with an
explicit `layout` attribute.

## Render on the server, then connect the player

```js
import { ResolvedMapSchema, renderFigure } from "@metronforge/concept-map";
const map = ResolvedMapSchema.parse(data);
const html = renderFigure(map, { id: "coffee" });
```

The returned string contains a complete `<figure>`, accessible controls,
live status, SVG, step panels, concepts, further reading and escaped JSON.
Supply a different `id` for each server-rendered copy of the same map so its
SVG marker is unique before JavaScript loads. `strings` accepts the same panel
translations as `MapPlayer`.

Place that string inside a host element. In the browser:

```js
import { mount } from "@metronforge/concept-map/dom";
import "@metronforge/concept-map/css";
const host = document.querySelector("#map-host");
const map = JSON.parse(host.querySelector("[data-map-data]").textContent);
const player = mount(host, map);
// When the host is removed:
player.destroy();
```

`mount` also accepts the figure itself. With an empty host, it creates the same
figure. With matching server data, it preserves the figure and SVG and connects
the controls. A different map replaces the figure contents. Repeated mounting
on the same host destroys the previous player's listeners and animation.
The returned `MapPlayer` supports the existing `dispatch`, `replay` and
`destroy` methods. Options combine `FigureOptions` and the player's options.
Hydration keeps the existing figure id; panel strings are applied by the player.

For an automatically laid-out map, `mount` and `MapPlayer` accept a
`narrowLayout` callback. It receives the container width in em of the drawn
arrow text and returns another layout of the same source map:

```js
const wide = await layout(source, dagreEngine);
const player = mount(host, wide, {
  narrowLayout: (widthEm) => layout(source, dagreEngine, { widthEm }),
});
```

The player requests this layout only when the wide drawing cannot be selected.
It checks both drawings with the real font and shows the first without hard
defects, falling back to panel labels while waiting or if neither is clean.
Returning to wide also requires one em of growth from the original switch.
Switches preserve the scenario, step, URL, focus and active token animation.
The callback must preserve the map's identifiers and content; only geometry may
change. Do not supply it for hand-drawn maps, whose geometry must stay fixed.

The player keeps the last requested width and candidate, shares pending work at
that width, and ignores superseded results. A failed callback emits a bubbling
`maperror` with the error in `detail`; it is retried only at a different width.
Destroying the player ignores pending results. Hosts own engine imports; the
player does not load an engine. Custom-element layout does not yet supply this
callback automatically.

## Use the custom element

```js
import "@metronforge/concept-map/element";
import "@metronforge/concept-map/css";
```

Importing `./element` registers `<concept-map>`. It is a browser-only entry;
import `.` for server rendering. It uses light DOM, not a shadow root.

```html
<concept-map src="coffee.json"></concept-map>
```

Alternatively, supply a direct child `<script type="application/json">` with
the map, or set `element.map = map`. The property works even when assigned
before the module registers the element. Precedence is: a defined `map`
property, then `src`, then direct-child JSON, then JSON inside a server-rendered
figure. Set `map = undefined` to return to URL or inline data.

To hydrate on the server, put `renderFigure(map)` inside `<concept-map>`.
Its embedded JSON supplies the input; the existing figure and SVG are reused.
The player still updates panels, fits labels and assigns a unique SVG marker.

`await element.ready` waits for the latest input and returns the player (or
`undefined` when no input exists yet or the request was superseded).
`element.player` exposes the current player. `mapready` bubbles with that player
in `event.detail`; `maperror` bubbles with the loading or validation error.
`ready` rejects on errors, even if nobody subscribes to the event. A failed input
leaves existing markup visible but stops its player. There is no silent fallback
to a lower-priority input. HTTP failures include the status code.

Changes to `src` or `map` cancel the previous fetch and ignore stale layout
results. Removing the element destroys its player and aborts loading. Reinserting
it starts at the first step and reconnects once. Inline JSON can arrive after
connection; updating a direct child script reloads it. Once mounted, its data
is retained in the figure's embedded JSON; use `map` or `src` for later changes.

## Supply layout for a source map

Resolved maps play immediately without downloading either engine. To display a
source map without coordinates, select an engine explicitly:

```html
<concept-map src="coffee.json" layout="dagre"></concept-map>
```

`layout="elk"` selects ELK instead. Importing the element alone loads neither
engine. The layout entry and selected adapter load through dynamic imports only
when a source map needs them. Bundlers must preserve code splitting to retain
this download behavior. Changing the attribute retries the original source,
including inline JSON that has already been replaced by rendered markup.

Alternatively, supply a function. `element.layout` takes priority over the
attribute. Dagre remains the recommended default:

```js
import "@metronforge/concept-map/element";
import { layout } from "@metronforge/concept-map/layout";
import { dagreEngine } from "@metronforge/concept-map/layout/dagre";

const element = document.querySelector("concept-map");
element.layout = (source) => layout(source, dagreEngine);
element.map = sourceMap;
```

Without an attribute or `element.layout`, a source map keeps the same explanatory
error. An unknown attribute value reports the supported names. A ready map or a
supplied callback bypasses attribute validation and automatic imports. Changing
the callback retries the current input. Returned maps are validated. Imports
are shared by the browser's module cache; failed or superseded loads never mount
an obsolete result. Framework wrappers remain separate work.

For a published version that includes this feature, a plain HTML page can load
`https://esm.sh/@metronforge/concept-map@VERSION/element` as a module script.
The CDN must serve the selected optional engine peer as well. Use a pinned version
and load the package CSS separately. Before publication, the same CDN supports a
GitHub source entry: `https://esm.sh/gh/metronforge/concept-map@COMMIT/src/element.ts`.
Replace `VERSION` or `COMMIT` with the intended release or full commit id. See
[esm.sh's registry documentation](https://github.com/esm-dev/esm.sh#supported-registries).
The live network check is recorded in the pull request.

## Move existing imports

The root entry now contains only schemas, model functions and renderers.
Import `MapPlayer`, `connectConcepts`, `Animator`, `Playback`, `FlowHooks` and
`Geometry` from `@metronforge/concept-map/dom` instead of the root. Importing
`./dom` does not register a custom element. The existing layout subpaths are
unchanged. This is a breaking API change; map format 3 is unchanged.
