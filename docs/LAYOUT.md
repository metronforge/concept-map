# Layout for format 3

Layout is an explicit asynchronous step before rendering. Install the engine
you intend to use; neither engine is loaded by the package root or player.

```ts
import { layout } from "@metronforge/concept-map/layout";
import { dagreEngine } from "@metronforge/concept-map/layout/dagre";

const resolved = await layout(source, dagreEngine);
```

Alternatively import `elkEngine` from
`@metronforge/concept-map/layout/elk` and pass it as the second argument.
The optional peers are `@dagrejs/dagre@^3.1.3` and `elkjs@^0.12.1`.
There is no default engine. Engine selection and visual comparison remain
task 0.2.0 item 4.

## Validation boundary

Before measuring or calling an engine, `layout()` parses the map and checks
every node, lane, edge, scenario, step, definition and code reference. Errors
include a source path and unknown ID, for example:

```text
scenarios[0].steps[1].show: unknown node “gest”
```

Scenario IDs and step IDs within a scenario must be unique. Concept step links
use their explicit scenario, then `conceptScenario`, then the first scenario.
`validateReferences()` is also available for already parsed maps.

Fully resolved maps retain their hand geometry after validation; partial geometry
is rejected. The input is never mutated. A resolved map with an invalid reference
is rejected, even if the renderer previously tolerated it. Schema parsing alone
does not provide this semantic validation.

## Measurement

The default DOM-free measurer uses a committed DejaVu Sans advance table covering ASCII, printable Latin-1, Latin Extended-A,
Greek/Coptic, Cyrillic and General Punctuation,
a fixed mono advance and a conservative one-em fallback for other characters.
It measures plain text without evaluating markup. It is deterministic, but cannot
guarantee a match to arbitrary host fonts. The font attribution is shipped beside
the table. Node boxes also reserve space for tags and scenario-specific labels.

For host-font measurements, wait for fonts to load and inject the browser adapter:

```ts
import { createDomMeasurer } from "@metronforge/concept-map/layout/browser";

await host.ownerDocument.fonts.ready;
const resolved = await layout(source, dagreEngine, {
  measureLabel: createDomMeasurer(host),
});
```

The host must be connected and visible, with the intended `--cmap-font-sans`
and `--cmap-font-mono` values. Measurement removes its temporary elements.
Different fonts or measurers can produce different geometry.

## Port contract

`LayoutEngine.layout(LayoutGraph)` returns a promise of `LayoutResult`.
The graph contains measured nodes, directed edges with optional measured labels,
and lanes in declaration order. Results contain node/lane boxes and edge
polylines; optional edge label positions are centres. Coordinates must be finite,
boxes positive, IDs complete and exact, and nodes must fit their measured sizes
and assigned lanes. Lanes are stacked top to bottom. Unassigned nodes follow them.

Both adapters use downward layout. ELK uses native layered partitions and
orthogonal routing. Dagre lays out the graph, stacks lane groups, translates
within-lane routes and generates orthogonal cross-lane routes. Empty lanes reserve
space via internal anchors. These are constraints, not claims about visual quality.
The resolver derives frames, labels, badges, repeat badges and the viewport.

Regenerate the table with `python3 scripts/font-metrics.py` (Pillow) and format
it with Prettier. The browser regression loads the pinned DejaVu Sans fixture,
so its five-percent Cyrillic tolerance is independent of installed host fonts.
