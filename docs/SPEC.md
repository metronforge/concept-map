# Concept map format v2 and the map player

Status: draft for implementation (task: `TASK.md` in this folder).

This document defines:

1. the data format of a concept map, in two forms;
2. the architecture and public API of the map player;
3. the test design for both.

The player is the interactive concept map on every spread and on the cover:
scenario chips, step-by-step mode, "Whole map" with the moving token and the
call log, the concept list and the prose callouts. Today it is
`src/components/map/mapPlayer.ts` (one 666-line closure) with data in
`src/components/map/data/*.ts` (23 files, 32,720 lines of TypeScript). The
cover (`src/content/docs/index.mdx`) shows the 2.1 map a second time.

## 0. Words

Each word below has one meaning in this document and in the code. Do not
use it for anything else.

| Word                             | Meaning                                                                                                                                                  |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **authored map** (`AuthoredMap`) | The YAML file that authors and agents edit. It refers to the book: spread numbers, Playwright files and lines                                            |
| **resolved map** (`ResolvedMap`) | The authored map after the book adapter has resolved every reference: URLs, page links, safe HTML. The only input of the player                          |
| **map id**                       | The file name without extension: `2-1` for `src/content/maps/2-1.yaml`                                                                                   |
| **scenario**                     | One story over the map (a chip above it). The old word **track** is retired everywhere, also in the DOM (§6)                                             |
| **step**                         | One entry of a scenario. In the UI: "Step i of n"                                                                                                        |
| **hop**                          | One movement of the token in "Whole map" mode: along an edge, or a jump to a node                                                                        |
| **hop step**                     | The step that the whole-map step list marks as current (`[data-li].now`) while that hop plays                                                            |
| **mode**                         | `step` or `all`: "Step by step" or "Whole map". In the DOM: `data-mode="step" \| "all"` (was `data-view`, §6)                                            |
| **revealed**                     | A node, edge, lane or frame that the current step or an earlier one has shown. Not revealed does not mean hidden: it is drawn as a ghost (class `ghost`) |
| **current**                      | The nodes and edges of the current step (class `cur`). Never called "focus": **focus** means keyboard focus only                                         |
| **frame model** (`Frame`)        | Everything the DOM shows for one player state (§7.1)                                                                                                     |
| **golden snapshot**              | A record of what the old player showed for one state (§8.4)                                                                                              |
| **reference spread**             | One of the four spreads where the browser tests check the player (§8.1)                                                                                  |

**Authority.** For behaviour, the old player decides: the golden snapshots
are the test, and the descriptions of rules in this document are only a
guide. For the data format and the API, this document decides.

## 3. Design rules

- **One file per map.** `src/content/maps/<map id>.yaml`, for example
  `2-1.yaml`. Geometry stays next to meaning (inside nodes and edges). A
  page shows a map by its map id; one map can appear on several pages (2-1
  is on spread 2.1 and on the cover).
- **Two forms.** The authored map and the resolved map (§0). The book
  adapter builds the resolved map at build time. The player accepts only the
  resolved map.
- **Stable ids, references by id only.** No numeric indices in the authored
  map. Indices exist only inside the player model.
- **Ids.** `^[A-Za-z][A-Za-z0-9_-]*$`. Node and frame ids are unique
  together, in one namespace, because an edge end can be a node or a frame.
  Lane ids have their own namespace: a lane and a node may share an id (six
  maps do this today, for example lane `app` and node `app` in 0-1).
  Existing node ids are kept as they are: tests and CSS use some of them
  (`[data-node="Browser"]`). The one node–frame clash today (`worlds` in
  1-3) is solved by renaming the frame to `worlds-frame`; frames have no
  ids in the DOM. The nine definition keys containing spaces in 4-3 are
  migrated to slugs with all references updated; their visible terms stay
  unchanged.
- **Step ids** are unique within their scenario. References to a step from
  outside its scenario use `{ scenario, step }`. When migrated, a step id is
  a slug of the step title: lowercase ASCII; every run of characters other
  than `a-z0-9` becomes one `-`; no `-` at the ends; cut to 32 characters,
  then remove a trailing `-`; prefix `s-` if it starts with a digit; add
  `-2`, `-3` for duplicates in the same scenario. After migration, ids are
  never regenerated: a new step gets a new id, a renamed step keeps its id.
  (Facts, 525 steps: 10 duplicate slugs, 1 slug that starts with a digit.)
- **Text.** Authored text is never read as HTML. A `<` is a literal
  character (the 4.2 map has the text `defined in <builtin>`). Inline
  marks: `` `code` ``, `*em*`, `**strong**`. Inside backticks everything is
  literal. `\` escapes the next `*`, `` ` `` or `\`. A mark without its
  closing pair is literal text. The adapter turns text into HTML that
  contains only `<code>`, `<em>` and `<strong>`; everything else is
  escaped. SVG text (node labels, tags, edge labels), log lines and code
  lines are plain text.
- **Version.** Both forms carry `format: 2`. The player throws a clear
  error for any other value.
- **Schemas.** Zod 4 schemas are the single source of truth. Types come from
  `z.infer`. A JSON Schema of the authored map is generated from Zod
  (`z.toJSONSchema`) and committed, so editors can complete YAML fields. A
  test fails if the committed JSON Schema is out of date.

## 5. Resolved map

The resolved map has the same structure and ids as the authored map. Only
the leaves change:

| Authored leaf                  | Resolved leaf                                                    |
| ------------------------------ | ---------------------------------------------------------------- |
| inline-marked text             | safe HTML string (§3, Text)                                      |
| `SourceRef`                    | `{ label, url }`, URL with the tag from `playwright-source.json` |
| spread number in `step.deeper` | `{ title, href }` from the published page (see Link titles)      |
| `deeper[]` (`spread`, `why`)   | `{ title, href, why }`                                           |
| code inset `lines`             | the same `lines` (plus `html` when task stage 7 is done)         |

**Link titles.** The title of a link to a spread is the spread number and
the page title, for example `4.2 Built on demand, torn down in reverse`
(`resolve-map.ts`). Today this equals every page's `sidebar.label`, so links
read the same as the sidebar. The old maps carried their own copies, and
they had drifted from the pages:

| Today's 72 link entries                                                                                             | Count |
| ------------------------------------------------------------------------------------------------------------------- | ----- |
| equal to the sidebar label                                                                                          | 43    |
| a different apostrophe (`’` / `'`)                                                                                  | 1     |
| the spread number is missing                                                                                        | 3     |
| different wording (old working titles, such as `4.2 Custom fixtures` and `4.2 Fixture lifecycle` for the same page) | 25    |

So 29 link titles change. This is the one planned visible change of this
version. Hrefs do not change (0 of 72 differ). The `why` text of each
`deeper[]` entry stays as authored in the map.

In today's data, some `spreads` keys are not spread numbers (`anatomy`,
`workers`, `auto` in 4-2 and 4-3). Migration finds the spread number from
the entry's href.

The adapter embeds the resolved map as JSON in
`<script type="application/json" data-map-data>`, as today.

## 6. DOM contract

CSS and tests depend on these names. They are part of the public API. In
this version they change only by the renames in the table below, so that
the DOM uses the words of §0. New `data-*` attributes may be added (for
example `data-edge`, `data-lane` and `data-frame` on the SVG groups, which
have no ids in today's DOM). No other name may change or disappear. The list
below is the minimum. Task stage 0 extracts the full list from
`src/styles/map.css`, `tests/book.spec.ts` and `src/components/callouts.ts`
and adds it here.

| Old name                       | New name                    | Used today in                                          |
| ------------------------------ | --------------------------- | ------------------------------------------------------ |
| `data-track`                   | `data-scenario`             | player, 21 places in `book.spec.ts`                    |
| `data-concept-track`           | `data-concept-scenario`     | player, `Concepts.astro`, 1 test                       |
| `data-role="tracks"`           | `data-role="scenarios"`     | `MapFigure.astro`, player                              |
| `data-role="nexttrack"`        | `data-role="nextscenario"`  | player                                                 |
| `data-view="step" \| "all"`    | `data-mode="step" \| "all"` | `MapFigure.astro`, player, 23 places in `book.spec.ts` |
| class `tracks` (`.seg.tracks`) | class `scenarios`           | `MapFigure.astro`, one selector in `map.css`, 1 test   |

Only the class is in CSS (one selector in `map.css`). The golden snapshots (stage 0) are taken with
the old names; the parity test does not depend on attribute names.

- Figure: `[data-figure="map"]`, `[data-map-data]`, `.map svg`,
  `[data-role="panel" | "more" | "scenarios" | "back" | "next" | "replay" |
"flowlog" | "nextscenario"]`, `[data-mode="step" | "all"]` with
  `aria-pressed`.
- Scenario chips: `[data-scenario="<scenario id>"]` with `aria-pressed`.
- Stepper: `[data-seg="<index>"]`, `aria-current="step"`, classes `done`,
  `now`; `.count` text `"<label> · Step i of n"` (`"Step i of n"` when
  `counterLabel` is false).
- Whole map: `[data-go="<index>"]`, `[data-li="<index>"].now`,
  `.line.old | .new | .err` in the flow log.
- SVG: `.lane`, `.frame`, `.node[data-node]`, `.edge`, `.etext`, `.badge`,
  `.badge.cur`, `.token`, `.token-glow`, state classes `ghost`, `cur`,
  `trail`, `visit`, `failnow`, `oknow`, `hl`, `.callout[data-callout]`.
- Panel: `.head h2`, `.log`, `.fix`, `.code .ttl`, `.code pre`, `.defs`,
  `.refs .src a`, `.hint`.
- Concepts: `[data-map-concepts] li[data-nodes]`, `[data-step]`,
  `[data-concept-scenario]`.

### 6.1 Extracted contract (stage 0)

Extracted from map.css, the map selectors in book.spec.ts, callouts.ts and
the existing component/player markup. The rename table above applies at
stage 5; shared prose-callout names remain owned by the book.

- Classes: `all`, `bad`, `badge`, `bar`, `below`, `callout`, `cgroup`, `cm`, `code`, `concepts`, `count`, `cur`, `custom`, `dash`, `deeper`, `def`, `defs`, `done`, `dot`, `edge`, `err`, `etext`, `fail`, `failnow`, `fix`, `flowbar`, `foot`, `frame`, `fwd`, `ghost`, `gloss`, `good`, `head`, `hint`, `hl`, `lane`, `line`, `log`, `map`, `map-concepts`, `map-deeper`, `map-figure`, `map-ui`, `meta`, `mono`, `more`, `n`, `nav`, `new`, `next`, `node`, `now`, `oknow`, `old`, `panel`, `prose`, `pwc`, `pwc-callout-token`, `pwc-fig`, `pwc-n`, `pwc-prose`, `refs`, `sbtn`, `seg`, `segs`, `src`, `stepper`, `tag`, `term`, `token`, `token-glow`, `tracks`, `trail`, `ttl`, `visit`.
- Attributes: `data-callout`, `data-callout-active`, `data-callout-paragraph-active`, `data-concept-track`, `data-figure`, `data-figure-callout`, `data-go`, `data-li`, `data-map-concepts`, `data-map-data`, `data-nodes`, `data-prose-callout`, `data-role`, `data-seg`, `data-step`, `data-view`.
- HTML/ARIA: figure id and tabindex=0, named Scenario and View button
  groups, aria-pressed on scenario/mode controls, aria-current=step,
  disabled boundary buttons, aria-live=polite panel, accessible SVG title,
  callout aria-controls/labels, linked figure/prose marker ids.
- Events: pwc-reveal-callout from prose to figure; mouseenter/leave and
  focusin/out on concepts; ArrowLeft/ArrowRight except in input/textarea/
  select; pagehide stops playback, pageshow(persisted) resets.
- SVG order: defs, lane/frame group, edges, nodes, edge text, badges,
  token/glow, callouts. Lanes/frames/edges retain authored key order.
- SVG attributes: viewBox, marker-end with per-figure marker id,
  visibility, cx/cy, textLength/lengthAdjust, and the measured label y
  positions/tspan x/y; label fitting must preserve them.
- Panel details move to .more in document order: in step mode, log, fix,
  code, defs, refs; in all mode, all-step list, flow log. The selector list
  in the old split() does not reorder them. Keyboard focus survives panel
  replacement.

## 7. Player architecture

Location: `src/lib/concept-map/`. A dependency test fails if a file in this
folder imports from outside it (`zod` is allowed only in `schema.ts`; other
files may import `schema.ts` only with `import type`).

```
src/lib/concept-map/
  schema.ts            Zod schemas, mapSchema(), ResolvedMap type
  index.ts             public exports
  model/               pure; compiled with a tsconfig without the DOM lib
    state.ts           PlayerState, Action, reduce()
    frame.ts           derive(map, state) → Frame
    flow.ts            planFlow(), reducedFlow()
    labels.ts          pure label-fit math (input: measured boxes)
  render/              pure; string output; compiled without the DOM lib
    inline.ts          inline marks → safe HTML (used by the book adapter)
    svg.ts             renderSvg(map) → static SVG markup with all elements
    panel.ts           renderPanel(map, frame, strings) → HTML string
    concepts.ts        renderConcepts(map), renderDeeper(map)
    text.ts            mapOutline(map) → MapOutline; outlineToMarkdown(); outlineToHtml() (§9)
  dom/                 browser adapters
    svgDom.ts          applyFrame(frame): toggles classes and attributes
    panelDom.ts        sets panel HTML, restores keyboard focus
    geometry.ts        Geometry port: pathLength, pointAt, textBox
    animator.ts        Animator port + Web Animations implementation (+ rAF fallback)
    player.ts          MapPlayer facade, connectConcepts()
```

### 7.1 Model

```ts
type Mode = "step" | "all";
interface PlayerState {
  scenario: number;
  step: number;
  mode: Mode;
}

type Action =
  | { type: "next" }
  | { type: "back" }
  | { type: "go"; step: number }
  | { type: "scenario"; index: number } // step becomes 0; mode stays
  | { type: "mode"; mode: Mode } // step stays
  | { type: "concept"; scenario: number; step: number } // mode becomes "step"
  | { type: "reset" }; // scenario 0, step 0, mode "step"

function reduce(map: ResolvedMap, s: PlayerState, a: Action): PlayerState;
function derive(map: ResolvedMap, s: PlayerState): Frame;
```

The initial state is `{ scenario: 0, step: 0, mode: "step" }`. Out-of-range
`go` and `scenario` values are clamped, as `go(d)` clamps today.

`Frame` holds everything the DOM shows for one state:

- `state`: the state used to derive the frame (for segment navigation);
- `nodes[id]: { revealed, current, label }`, `lanes[id].revealed`,
  `frames[id].revealed`, `edges[id]: { revealed, current }`,
  `edgeLabels[id].revealed`;
- `badges: { x, y, n, current }[]`: edge badges, repeat badges and node
  badges, numbered as today;
- `panel`: a tagged union.
  - `step`: counter, title, html, log lines `{ text, kind: old | new | err }`,
    fix, code, defs, sources, deeper, `canBack`, `canNext`,
    `nextScenario?`.
  - `all`: count, title, text, step list, `hasFlowLog`.

The panel and badge rules are today in `render()` and `renderPanel()` of
`mapPlayer.ts`. Move them as they are. Their descriptions in §8.2 are a
guide; the golden snapshots decide.

### 7.2 Flow plan

```ts
interface FlowPlan {
  segments: Segment[]; // pause | jump(from, to) | travel(edge, reverse)
  hops: {
    startSegment: number; // mark the step before movement
    segment: number; // arrival: start of the dwell pause
    step: number;
    node: string;
    log: string[];
    fail: boolean;
  }[];
}
function planFlow(
  map: ResolvedMap,
  scenario: number,
  geo: { length(edge: string): number },
): FlowPlan;
function reducedFlow(
  map: ResolvedMap,
  scenario: number,
): {
  trail: string[];
  visited: string[];
  failed: string[];
  log: LogLine[];
  lastStep: number;
};
```

Timing constants are kept: speed 0.28 viewBox units per ms; a jump lasts at
least 120 ms and is skipped below 2 units; a travel lasts at least 220 ms;
400 ms before the first hop; 280 ms after a hop, 750 ms after a failed hop.

### 7.3 Animator port

```ts
interface Animator {
  play(
    plan: FlowPlan,
    hooks: {
      onHop(i: number): void; // arrival, before the dwell pause
      onDone(): void;
      onHopStart?(i: number): void; // mark the step before movement
      onSegment?(segment: Segment): void; // trail begins with travel
      onHopEnd?(i: number): void; // clear success after the dwell
    },
  ): Playback;
}
interface Playback {
  stop(): void;
  readonly finished: Promise<void>;
}
```

- Default implementation: Web Animations API. Travel uses
  `offset-path: path("<edge path>")` and animates `offset-distance`. Jumps
  and pauses are keyframe animations too. `stop()` cancels all of them.
- Use `path("…")`, not `url(#id)`. Check the token position in Chromium,
  Firefox and WebKit once (§8.3). If any engine draws the token off the
  path, use a `requestAnimationFrame` implementation of the same interface
  with an injectable clock, and record the reason in the log.
- Reduced motion: no animation; the player applies `reducedFlow()` at once.
- Required `onHop`/`onDone` callbacks produce the complete arrival/final
  state even if a supplied animator omits optional phase callbacks. The
  optional callbacks refine the before-movement and after-dwell timing.

### 7.4 Geometry port

```ts
interface Geometry {
  pathLength(edge: string): number;
  pointAt(edge: string, t: number): [number, number];
  textBox(el: SVGGraphicsElement): {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}
```

The DOM implementation uses `getTotalLength`, `getPointAtLength` and
`getBBox`. Tests use a fake. Label fitting (`sizeLabels` today) is split:
the DOM part measures, and the pure part in `model/labels.ts` decides.

### 7.5 Facade

```ts
class MapPlayer {
  constructor(
    root: HTMLElement,
    map: ResolvedMap,
    options?: {
      animator?: Animator;
      geometry?: Geometry;
      reducedMotion?: boolean; // default: matchMedia
      strings?: Partial<UiStrings>; // English defaults, as today
    },
  );
  readonly state: PlayerState;
  dispatch(action: Action): void;
  highlight(nodes: string[], on: boolean): void;
  replay(): void;
  destroy(): void; // removes listeners and observers, stops playback
}
```

- Every state change dispatches a `mapchange` `CustomEvent` on `root` with
  the new state.
- Keyboard: ← and → in step mode, ignored in inputs.
- `pagehide` stops playback and sets scenario 0, step 0 (mode stays, as
  today). `pageshow` with `persisted` dispatches `reset`.
- `connectConcepts(player, container)` binds the concept list: hover and
  keyboard focus highlight the nodes; a click dispatches `concept` and
  moves keyboard focus to the step's segment.
- Prose callouts stay in the book (`callouts.ts`). The player draws the
  callout markers from `map.callouts` and sets `data-callout` on nodes, as
  today.

### 7.6 Server rendering

`MapFigure.astro` renders `renderSvg(map)` and the panel of the initial
state at build time. The player then connects to that markup. So the first
step is readable without JavaScript, and `.astro` output can be tested
without a browser.

## 8. Test design

### 8.1 Layers

| Layer         | Runner                                      | What                                                        | Where it runs                    |
| ------------- | ------------------------------------------- | ----------------------------------------------------------- | -------------------------------- |
| Types         | `astro check`, `tsc -p tsconfig.model.json` | `model/` and `render/` compile without the DOM lib          | every PR                         |
| Schema        | Vitest                                      | each rule E1–E7, W1–W2 has a failing fixture; all maps pass | every PR                         |
| Model         | Vitest + fast-check                         | `reduce`, `derive`, `planFlow`, label math                  | every PR                         |
| Render        | Vitest + fast-check                         | string renderers, escaping, inline marks                    | every PR                         |
| Adapter       | Vitest + Astro Container API                | `MapFigure` output; `resolveMap` URLs and hrefs; E8         | every PR                         |
| Parity        | Vitest                                      | the new model equals the golden snapshots                   | during migration only            |
| DOM contract  | Playwright `@player`                        | adapters on reference spreads                               | PR when the player changes; main |
| Spread layout | Playwright `@spread`                        | each spread on a phone, every step                          | PR for changed spreads; main     |

Reference spreads for `@player`: 0-1 (node labels, a concept in another
scenario, tags, a frame), 2-1 (reverse hops, `Error` lines, `fix`, a
one-step scenario, edge badges off), 2-4 (the only map with repeat badges),
5-2 (the only map with a cumulative log). Each runs at 1280 px light and
390 px dark.

### 8.2 Vitest properties

Shared arbitraries go to `tests/unit/arbitraries/map.ts`. Real data comes
from the maps; generated data comes from mutating real maps (drop a node,
rename an id, reorder steps), not from a free generator.

`reduce`, model-based (`fc.commands`). The model is only
`{ scenario, step, mode, stepsPer: number[] }`. Commands: Next, Back,
Go(n), Scenario(i), Mode(m), Concept(i, n), Reset. After each command:

- `0 ≤ step < steps(scenario)`;
- Back at step 0 and Next at the last step change nothing;
- Scenario(i) sets step 0 and keeps the mode;
- Mode keeps the step; Concept sets mode `step`; Reset gives the initial
  state;
- the state of the system under test equals the model state.

`derive`, over every map, scenario, step and mode:

- monotone: revealed nodes and edges at step k+1 ⊇ step k;
- mode `all` = the revealed set of the last step;
- current nodes are nodes of the map; in mode `all` nothing is current;
- an edge badge shows 1 + the index of the first step that lists the edge;
- `canBack ⇔ step > 0`; `canNext ⇔ step < last`;
  `nextScenario ⇔ step = last and scenario < last scenario`;
- incremental log: old lines are the last ≤ 3 log lines of the previous
  step; cumulative log: no old lines.

The badge rule is a compound condition: the edge is revealed, it has a
badge, mode is `all` or edge badges are on, a step at or before this one
lists the edge, and no repeat badge replaces it at this step. Build one
partition per condition with a neutral case fixed (independence analysis),
so each independent condition changes the result at least once. In the old
player, having a first revealing step already implies that an edge is
revealed: those two conditions cannot be toggled independently. Check that
implication and the partition where display reveals an edge without any
step listing it (no badge). Do not rely on one wide arbitrary.

`planFlow`:

- hop order and hop steps follow `scenario.flow`;
- the concatenated log equals `flow.flatMap(h => h.log)`;
- durations follow the constants in §7.2 for any positive path lengths;
- metamorphic: doubling every path length doubles each travel time that
  was above its minimum, keeps the others at least at the minimum, and
  changes no jump, pause, hop or log;
- `reducedFlow`: trail = the set of hop edges; last step = the last hop
  step.

Render:

- for any string (`fc.string` with full Unicode), inline marks → HTML
  contains no tag other than `code`, `em`, `strong`, and its text content
  equals the input with the marks and escapes removed;
- `renderPanel` and `renderSvg` escape every string of the map (put `<`,
  `"` and `&` into labels and titles);
- roundtrip: authored YAML → parse → serialize → parse gives an equal
  object;
- text form (§9), over every map: every scenario label, step title, step
  text, log line, code line, definition, concept and source URL appears in
  `outlineToMarkdown()` and in `outlineToHtml()`; both carry the same items
  in the same order; the output is deterministic (same map → same bytes).

Parity (migration only): compare the frame model and the panel model from
`derive` with the golden snapshots (§8.4), field by field, for every map,
scenario, step and mode, and the reduced flow with the reduced-motion
snapshot. Link titles are the one planned difference (§5, Link titles): for
them, the test checks that the new title equals the page's sidebar label,
and it writes every changed title (old → new, map, step) to a list. That
list must contain exactly the 29 changes known today. No HTML parser is needed: both sides use the snapshot shape. Any
difference fails, or is listed in the log with a reason and stops the task
for review.

### 8.3 Playwright

`@player` (reference spreads only), on the built book:

- for every step of every scenario: the DOM state equals `derive()` for that
  state (classes on nodes, edges, lanes, frames; badge positions and
  numbers; panel text). The test imports `derive` and reads the resolved
  map from the page's JSON;
- keyboard, keyboard focus after a panel re-render, `aria-current`;
- bfcache: `pagehide` + `pageshow(persisted)` resets; reload resets; back
  navigation resets;
- animation: control time with `document.getAnimations()` (`currentTime`,
  `finish()`), not with `page.clock` loops and not with sleeps. Check that
  the token is on the edge path at the middle of a travel (distance to the
  path ≤ 1 unit), that replay and choosing a step cancel all animations,
  and that the log ends equal to the hop logs;
- reduced motion: no animations; final state at once;
- concepts and callouts: hover, keyboard focus, click, tap;
- `destroy()`: after it, clicks and keys change nothing and no animation
  runs;
- once, locally, run the animation test in Firefox and WebKit too (§7.3).

`@spread` (every page with a map, one test per page and viewport,
`test.step` per check):

- 390 px, reduced motion: every step of every scenario, no side scroll on
  the page, code insets do not overflow;
- the existing checks: labels readable and not overlapping, player controls
  on one baseline, callouts link prose and figure, accessible description.

The four old player tests that run on all 23 spreads × 2 layouts are
deleted after parity and `@player` pass.

### 8.4 Golden snapshots (before any change)

On the current `main`, a Playwright script visits each page with a map and
records, for every scenario, step and mode, one snapshot in this shape:

```ts
interface GoldenSnapshot {
  scenario: string; // id
  step: number; // index
  mode: "step" | "all";
  nodes: Record<string, { ghost: boolean; cur: boolean; label: string }>;
  edges: Record<string, { ghost: boolean; cur: boolean }>;
  lanes: Record<string, { ghost: boolean }>;
  frames: Record<string, { ghost: boolean }>;
  edgeLabels: Record<string, { ghost: boolean; lines: string[] }>;
  badges: { x: number; y: number; text: string; cur: boolean }[]; // sorted
  panel: {
    count: string;
    title: string;
    text: string;
    log: { text: string; kind: "old" | "new" | "err" }[];
    fix?: string;
    code?: { title: string; source?: string; text: string };
    defs: { term: string; text: string }[];
    sources: string[]; // hrefs
    deeper: { href: string; title: string }[];
    canBack?: boolean;
    canNext?: boolean;
    nextScenario?: string;
    steps?: string[]; // mode "all": list titles
  };
}
```

Plus one snapshot per scenario of the final reduced-motion flow: trail
edges, visited and failed nodes, log lines, the marked step. Edges, lanes
and frames have no ids in today's DOM (the old tests find an edge with
`.edge` and the index of its key in `data.edges`): identify them by
document order, which is the key order of the old data, and map the order
to ids once. Output: `research/map-player/golden/<map id>.json`. The golden
files are deleted in task stage 6; they must not freeze the behaviour
afterwards.

### 8.5 Speed targets

- `npm run test:unit` (Vitest): under 15 s locally.
- `@player`: under 2 min of worker time.
- The whole browser suite: at most half of today's worker time (today about
  1,380 s in CI).
