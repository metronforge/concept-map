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

### Layout for a known width

Pass `widthEm` to reserve space for text that grows relative to a map when
the drawing shrinks to its container. The value is the available width divided
by the intended on-page arrow-label font size, in the same units. For example,
a 360 px container with 16 px arrow text has `widthEm: 22.5`.

```ts
const narrow = await layout(source, dagreEngine, { widthEm: 22.5 });
```

The width must be finite and positive. When the natural drawing is wider,
layout uses its scale to reserve larger text in a second engine pass, then
refines arrow labels and step numbers at the returned drawing's scale using
the shared placement stage. Engine calls are bounded at two: some graphs
cannot fit their text at the requested width. The result remains a proposal;
check it with the actual drawn font before choosing it over panel labels.
`strict` checks using the final scale and the supplied measurer.

Omitting the option, or supplying a width at least as large as the natural
drawing, preserves the default result. Resolved hand drawings retain their
geometry even when a width is supplied. The player does not yet request or
switch to a narrow layout automatically.

### Refinement after fonts load

`Measurer` is an object with a `name` and `measure(text, style)` method.
`fontTableMeasurer` is the server adapter. Both `layout` and `check` accept
this object or the existing plain function in `measureLabel`.
`createDomMeasurer(host)` keeps returning a plain function.

```ts
import { refine, check } from "@metronforge/concept-map/layout";
import { domMeasurer } from "@metronforge/concept-map/layout/browser";

await host.ownerDocument.fonts.ready;
const measurer = domMeasurer(host);
const drawn = refine(resolved, measurer);
const report = check(source, drawn, { measureLabel: measurer });
```

`domMeasurer` reads the player's actual arrow-label font and wrapping when
markup is present, and otherwise uses the host's font variables. The player
refines after fonts become ready, after later fonts load and on resize.
`player.map` retains the refined geometry and all semantic arrow labels,
including labels currently presented in the panel. DOM code still handles text wrapping,
node-text fitting and the SVG's size; only the core chooses arrow-label and
step-number positions.

Measurements may include `uncertainty`, an allowance for Euclidean boundary displacement in
map units. The DOM adapter uses 1/64 of the rendered font size for subpixel
measurement differences. This is an allowance, not a guarantee that different
fonts have equal metrics. The checker adds the allowances of the text blocks
in a contact: it calls the contact `clear` or `defect` only when the whole
gap interval lies in that band, otherwise `tight`. Each recorded contact
includes its nominal `gap` and, when nonzero, `uncertainty`, both in em.
The checker measures independently; it never trusts saved uncertainty.
Font tables and legacy functions omit the allowance, preserving their reports.
Uncertainty applies only to contacts involving text. Step numbers against
boxes or other step numbers remain exact.

`refine` is pure: it returns a new map, preserves label centres, and moves a
step number only when it covers measured text, its paint clearance, or a node box. It uses the
existing outward candidate search. Node boxes, lanes, frames, paths and the
view box stay unchanged. It does not fix lines crossing labels or overlapping
numbers; `check` reports remaining defects. Measurement provenance occupies
one optional resolved field, described in [FORMAT](FORMAT.md#text-measurements).

### Arrow labels in the panel

After refinement, `labelsInPanel(resolved, report)` returns true for hard
arrow-label contacts with lines, boxes, other labels or step numbers. Tight
contacts and unrelated defects do not trigger it. The player checks again on
resize and font changes; clear drawings regain their labels. Boxes, lanes,
frames, routes and the view box stay fixed.

```ts
import { labelsInPanel } from "@metronforge/concept-map/layout";
import { derive, renderSvg, renderPanelParts } from "@metronforge/concept-map";

const frame = derive(drawn, state, {
  labelsInPanel: labelsInPanel(drawn, report),
});
const svg = renderSvg(drawn, { frame });
const panel = renderPanelParts(drawn, frame);
```

The selected frame has `panel.arrowLabels`, an ordered list of `{ step, text }`.
In step mode it contains the current step's labelled arrows, in authored order.
Whole-map mode groups labels beneath each step title. An arrow used again appears
beside each step that uses it. Empty labels produce no rows. Inline code, emphasis
and strong text use the same escaped renderer as step explanations.

The SVG label group becomes hidden and excluded from the accessibility tree;
the text appears once in the panel. Hidden SVG elements remain available for
measurement, so resizing can restore the drawing. Width and font changes update
only label rows, preserving keyboard focus, playback, and the flow log.

`check` judges the geometry supplied to it. To check a presentation with labels
in the panel, copy the resolved map and omit its edge `label` fields; keep the
original labels for rendering the panel. The browser acceptance checks read which
SVG labels are actually visible before constructing that drawing.

The checker includes node step numbers in label contacts. Their intentional
contact with their own node is not a box defect. Hand-drawn SVG arcs are supported
using 16 chords per arc, matching the approximation used for other curves;
paths without a stroke contribute no line segments.

## Port contract

`LayoutEngine.layout(LayoutGraph)` returns a promise of `LayoutResult`.
The graph contains measured nodes, directed edges with optional measured labels,
and lanes in declaration order. Results contain node/lane boxes and edge
polylines; optional edge label positions are centres. Coordinates must be finite,
boxes positive, IDs complete and exact, and nodes must fit their measured sizes
and assigned lanes. Lanes follow the declared direction: top to bottom for `down`, left to right for
`right`. Unassigned nodes follow them.

Both adapters accept the source map’s optional `direction: "down" | "right"`;
omission means `down`. This sets the axis, not a required order for cyclic graphs. ELK uses native layered partitions and
orthogonal routing. Dagre lays out the graph, stacks lane groups, translates
within-lane routes and generates orthogonal cross-lane routes. Empty lanes reserve
space via internal anchors. These are constraints, not claims about visual quality.
The resolver derives frames, labels, badges, repeat badges and the viewport.

Regenerate the table with `python3 scripts/font-metrics.py` (Pillow) and format
it with Prettier. The browser regression loads the pinned DejaVu Sans fixture,
so its five-percent Cyrillic tolerance is independent of installed host fonts.

Both adapters try compact self-transitions on all four sides of each node,
keeping measured labels beside their loops and checking neighboring node boxes
and earlier loops with a twelve-unit margin. If a crowded graph has no clear
compact candidate, the adapters retain the original engine routing for all
self-transitions in that graph. This conservative fallback preserves existing
routes instead of introducing known collisions; it is not general obstacle
routing, and those exceptional loops may be larger than their nodes.

Internally, pure measurement builds one `LayoutProblem` for every placer:
measured nodes and arrow labels, lane groups, and typed constraints. Direction
is preferred; ordered, disjoint lanes containing their assigned nodes are
required. Both built-in placers declare these capabilities. The existing
`LayoutEngine` interface and adapter exports are unchanged; custom engines
are bridged using the direction and lane obligations of that interface.

Before placement, unsupported required constraints name the constraint and
placer in an error. Unsupported preferences are listed in the internal
placement outcome. An engine exception, an unsupported capability, and a
rejected result are separate tagged outcomes. After placement, the
checker verifies lanes from the original source and resolved geometry, even
without `strict`; `check(source, resolved)` uses the same rule. It uses the
renderer's viewport defaults for hand-drawn lanes without explicit widths.
Direction remains descriptive in the existing `reading` report. No new
constraint hints or placement algorithms are added here.

### Layout errors and constraint reports

`check(source, resolved)` returns `constraints` verdicts with `kind`,
`strength`, `holds` and `message`. A broken required lane rule adds one to
`hard`; it does not throw. This applies to hand drawings too. Direction still
uses the existing `reading` facts, not a forward-edge requirement.

`layout()` converts pipeline data to exceptions at its public boundary:
`EngineFailedError` carries `placer` and `cause`, `ResultRejectedError`
carries `placer` and `constraint` for a rejected proposed drawing, and
`UnsupportedConstraintsError` carries `placer` and `constraints`.
`LayoutDefectsError` retains its name and full `report` for strict quality
failures. They extend `LayoutError`, which carries `kind` and `data`.
All classes and their `is…` guards are exported by the layout entry point.
Guards check names and kinds rather than prototypes, so duplicate bundles
work. Rejection of a drawing is not proof that the map is contradictory.
