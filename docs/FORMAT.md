# Format 3

A **source map** describes meaning without geometry. A **resolved map** adds
geometry and is the player's input. Both carry `format: 3`. Format 2 is rejected.
ADRs [0006](adr/0006-no-book-vocabulary.md), [0011](adr/0011-source-map-and-layout.md)
and [0013](adr/0013-format-3-schema-details.md) define this boundary.

```js
import { SourceMapSchema, ResolvedMapSchema } from "@metronforge/concept-map";

const source = SourceMapSchema.parse({
  format: 3,
  id: "coffee-shop",
  title: "Coffee shop",
  layers: { service: { label: "Service" } },
  nodes: { guest: { label: "Guest", layer: "service" } },
  scenarios: [
    {
      id: "normal",
      label: "Normal",
      steps: [
        {
          id: "order",
          title: "Order",
          text: "Ask for **coffee**",
          show: ["guest"],
        },
      ],
    },
  ],
});
```

This item supplies schemas, not automatic layout. Before playback, supply
`viewBox` and node boxes (and geometry for any lanes, frames or edges), then
parse with `ResolvedMapSchema`. Do not pass source maps directly to `MapPlayer`.

## Shared fields

Required root fields: `format`, `id`, `title`, `layers`, `nodes`, `scenarios`.
Layer keys, node/edge identifiers and references use
`^[A-Za-z][A-Za-z0-9_-]*$`; the map's own `id` is any nonempty string.
Nodes, lanes and concept groups refer to a declared layer key.

| Field                                                        | Meaning / default                                                                              |
| ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------- |
| `layers`                                                     | Record of layer id → `{ label }`; no built-in layer vocabulary                                 |
| `nodes`                                                      | Record of `{ label, layer, lane?, tag?, mono?, fail?, custom? }`                               |
| `lanes`                                                      | Record of `{ label, layer }`; defaults to `{}`                                                 |
| `frames`                                                     | Record of `{ label, showWith }`; defaults to `{}`, `showWith` to `[]`                          |
| `edges`                                                      | Record of `{ from, to, label?, dashed? }`; defaults to `{}`                                    |
| `definitions`, `code`, `callouts`                            | Default to `{}`                                                                                |
| `concepts`, root `deeper`                                    | Default to `[]`                                                                                |
| `conceptScenario`                                            | Optional; defaults in rendering to the first scenario                                          |
| scenario `display`                                           | Existing defaults: counter/edge badges on, node badges off, progressive edges, incremental log |
| step `show`, `current`, `edges`, `defs`, `sources`, `deeper` | Default to `[]`; no visibility is inferred                                                     |
| hop `log`                                                    | Defaults to `[]`                                                                               |

Scenarios require id, label and at least one step; steps require id, title and
text. Flow and whole-map summaries remain optional. Concept sources are optional.
Root `deeper` entries are `{ title, href, why }`; step links are `{ title, href }`.
Source links are `{ label, url }`.

## Geometry

| Field                     | Source               | Resolved                                  |
| ------------------------- | -------------------- | ----------------------------------------- |
| root `viewBox`            | Absent               | Required `[width, height]`                |
| node `box`                | Absent               | Required `[x, y, width, height]`          |
| lane `y`, `h`, `x`, `w`   | Absent               | `y`, `h` required; `x`, `w` optional      |
| frame `box`               | Absent               | Required box                              |
| edge `path`, `badge`      | Absent               | SVG `path` required; badge point optional |
| edge `label`              | Optional text string | Optional `{ text, at: [x, y] }`           |
| scenario `repeatBadges[]` | `{ edge, step }`     | `{ edge, step, at: [x, y] }`              |

Source schemas reject geometry. The two exported JSON Schemas describe author
input, including optional fields with defaults. Zod parsing supplies those
defaults and validates layer references. Other cross-reference checks remain the
host adapter's responsibility (D7); JSON Schema alone cannot check references.

## Text and migration from format 2

1. Set `format: 3`; rename root `spread` to `id`, retaining its value.
2. Declare every used layer in `layers`. Keep arbitrary domain-specific keys;
   nodes, lanes and concept groups refer to those keys.
3. Replace pre-rendered HTML in step text/fix, whole-map text, definition text,
   concept short text and root deeper why with plain text and inline marks:
   `` `code` ``, `*em*`, `**strong**`. Escape literal backslashes, asterisks and
   backticks with a backslash outside code spans. Decode HTML entities first;
   HTML-looking strings now display literally and are escaped by the renderer.
   Labels, code lines and link labels remain literal text without inline marks.
4. Retain geometry for resolved maps. A source map omits geometry entirely.
5. Replace host colour assignments with `--cmap-layer-<id>` on both figure and
   concept containers. The fallback is `--cmap-layer`. Concepts and nodes now
   use the same declared layer; `app` no longer maps implicitly to `test`. Frame outlines now use `--cmap-frame` (formerly `--cmap-runner`),
   successful code lines use `--cmap-success` (formerly `--cmap-server`),
   and failure styling retains `--cmap-fail`.
6. Consumers of `derive()` read step-panel `text` instead of `html`, and treat
   it as inline source text, not pre-rendered markup.

Use the same parsed resolved map for server rendering and browser playback.
The generic `mapSchema(leaf)` kernel now also uses format 3, generic layers,
`id`, defaults and direct root deeper leaves; book adapters must migrate in
their own repository. Links remain structured data, never inline HTML. Hosts
must still validate cross-references and apply their URL policy to imported maps.

The optional top-level `direction` is `down` or `right`. It selects the layout axis
for both engines; omission keeps the downward layout. Resolved maps retain their
supplied geometry.
