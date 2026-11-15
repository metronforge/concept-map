# ADR 0025: layout is a pipeline of stages with a shared problem description

Status: proposed. The author accepts it by merging the pull request that
changes this line to "accepted".

## Context

The three examples exposed defects that no numeric check had caught: labels
on lines, step numbers over labels, a self-transition reaching a neighbour,
maps too large or too small, a fix that held in Chromium and failed in
Firefox. Each was repaired inside one engine adapter or in CSS. The hand-drawn
maps of the book still read better than any automatic layout.

The cause is structural. Today "layout" is one port: an engine receives boxes
and edges and returns everything. Whatever the engine does not do well
(labels, loops, step numbers, intent) is patched around it, once per engine,
with sizes estimated from a font table.

Before changing the structure we looked at how established tools divide the
same work.

## What other tools do

| Tool                                    | Kind, licence              | What it does well                                                                                                                                                                                              | What we take                                                                                            |
| --------------------------------------- | -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Graphviz dot                            | C, EPL                     | Layered drawings; edge labels are invisible nodes, so space is reserved for them; a 30-year-old vocabulary of author hints (`rankdir`, `rank=same`, `weight`, `constraint=false`, `ordering`, ports, clusters) | The hint vocabulary; labels reserved during placement; optional build-time engine and reference drawing |
| ELK layered                             | Java → JS, EPL             | Same pipeline with exchangeable phases; keeps the order the model was written in; "interactive" phases that start from existing positions; label side selection; self-loops; nested nodes; ports               | Engine for quality and for layout "from a sketch"                                                       |
| dagre                                   | JS, MIT                    | Small, fast layered layout                                                                                                                                                                                     | Default engine in the browser                                                                           |
| yEd                                     | Java, closed               | Layout from a sketch; label placement as its own step: each label has candidate positions and the least conflicting one wins                                                                                   | Label placement as a separate stage with candidates and costs                                           |
| OGDF                                    | C++, GPL                   | Every phase (ranking, crossing reduction, coordinates, routing) is a replaceable module with defined data in between                                                                                           | Stages with explicit contracts                                                                          |
| Tulip                                   | C++, LGPL                  | Algorithms are plugins that read and write named properties of one graph                                                                                                                                       | Intermediate results are data, not hidden state                                                         |
| Sprotty                                 | TS, EPL                    | The browser first renders invisibly to measure real sizes, then layout runs with them                                                                                                                          | Measure with the font that draws; estimates are never final                                             |
| Adaptagrams: libcola, libavoid; Dunnart | C++, LGPL                  | Placement by constraints (alignment, separation, no overlap) and connector routing around obstacles are separate libraries; constraints survive editing                                                        | Placement and routing are separate ports; relations as constraints                                      |
| WebCola                                 | JS, MIT, last release 2019 | libcola in the browser: gaps, alignment, no overlap, flow direction; includes a grid router                                                                                                                    | Candidate adapter for relative placement                                                                |
| libavoid-js                             | WebAssembly, LGPL, beta    | Orthogonal routing around boxes with nudging of parallel segments; used by draw.io and JointJS                                                                                                                 | Candidate router, loaded separately, never bundled                                                      |
| JointJS, draw.io                        | JS, MPL / Apache           | A router chooses the route points, a connector turns them into a line shape; anchors on shapes                                                                                                                 | Route (points) and path (shape) are separate steps; sides of a box as edge ends                         |
| Dia                                     | C, GPL                     | Hand placement with connection points on shapes                                                                                                                                                                | Edge ends may name a side of a box                                                                      |
| Cytoscape.js, sigma.js                  | JS, MIT                    | Layout engines are extensions; label style gives text a background and a margin                                                                                                                                | Halo under label text (done)                                                                            |
| Mermaid, D2, PlantUML                   | Text to diagram            | One description, several engines                                                                                                                                                                               | Engine is a choice, the description does not change                                                     |
| TikZ, MetaPost, TeX, Cassowary          | Typesetting                | Relative placement, equations instead of coordinates, "badness" as a number to minimise                                                                                                                        | Relations in the source map; a quality report with a number per defect                                  |
| Structurizr                             | Java                       | One model, many views                                                                                                                                                                                          | Meaning and layout intent are separate parts of the source map                                          |

Three lessons recur: the work is done in stages with data between them;
placement, routing and labelling are different problems; the author's intent
is part of the input.

## Evidence

Hints derived from the first scenario were tried on the three examples
([experiment](../evidence/layout-hints/README.md)). They repair the one wrong
reading order (ELK placed the barista before the guest) and give the most
compact drawing; with hints Graphviz draws the coffee shop as one straight
row. So intent has to reach the engine, and the scenarios already contain it.

## Decision

### 1. One description of the problem

Every engine receives the same `LayoutProblem`, built by pure functions from
the source map:

- nodes with measured sizes, edges with measured label sizes, groups (lanes;
  later, nested nodes);
- **constraints**, each `required` or `preferred`:

| Constraint  | Meaning                                                                  | Source                                                     |
| ----------- | ------------------------------------------------------------------------ | ---------------------------------------------------------- |
| `direction` | reading direction, down or right                                         | map                                                        |
| `order`     | keep nodes in the given order                                            | first scenario, or as written                              |
| `mainPath`  | these edges run as straight as possible                                  | first scenario, or stated                                  |
| `free`      | this edge does not influence ranks (return arrows, loops back)           | derived for edges that return to a visited node, or stated |
| `sameRank`  | these nodes share a row or column                                        | stated                                                     |
| `relation`  | A is right of / left of / above / below B, with a gap; A aligns with B   | stated (`at`)                                              |
| `pin`       | position of a node: `preferred` for a sketch, `required` for hand layout | stated                                                     |
| `side`      | an edge leaves or enters a box on a given side                           | stated                                                     |

The four levels of ADR 0021 are not modes. They are how many constraints a map
states: none, hints, relations, pins.

Each adapter declares which constraints it supports. A `required` constraint
an adapter cannot honour is an error that names it; a `preferred` one is
listed in the report. Nothing is dropped silently.

### 2. Stages

```text
source map
  → validate        references, ids                          (pure)
  → measure         text sizes                               port Measurer
  → intent          constraints from scenarios and the map   (pure)
  → place           node boxes, reserved label boxes         port Placer
  → route           point lists around boxes, loops, sides   port Router
  → label           arrow labels and step numbers            (pure)
  → shape           points → SVG path                        (pure)
  → report          defects as numbers                       (pure)
resolved map
```

- **Measure.** `Measurer` has two adapters: a font table for servers and the
  DOM for browsers. A resolved map records which one produced it. In the
  browser `refine(map, measurer)` re-runs _label_ and _shape_ with real sizes
  after fonts load; it never moves a node.
- **Place.** `Placer` adapters: dagre, ELK, relations (constraints solver),
  manual (positions given). A layered engine may return routes too; then
  _route_ only normalises them.
- **Route.** `Router` adapters: the engine's own routes; later a router around
  fixed boxes for relative and hand placement. Self-transitions are drawn by
  one pure function for every engine: a small loop on a free side.
- **Label.** One pure stage for all engines and for hand layouts. Arrow labels
  and step numbers are both labels: each gets candidate positions along its
  route and beside it, a cost for covering a box, a line or another label, and
  the cheapest candidate wins. The engine's suggestion is the first candidate.
- **Report.** A pure function of the resolved map: crossings, labels covered,
  numbers covering labels, loops touching boxes, share of the main path that
  follows the reading direction, text scale. The same function serves the
  author (`layout()` returns it; `strict` turns hard defects into errors), the
  browser tests of AGENTS.md "Visual acceptance", and the comparison page. The
  hand-drawn book maps give the baseline.

Stages between ports are pure functions over immutable data, as ADR 0001
requires. Ports stay interfaces; adapters are the only code that imports an
engine (ADR 0003, 0011).

### 3. Modules

```text
layout/problem     LayoutProblem, constraints, capabilities   types
layout/intent      scenarios → constraints
layout/stages/     validate, label, loops, shape, report, refine
layout/ports       Measurer, Placer, Router
layout/adapters/   table-measurer, dagre, elk, relations, manual, …
dom/               dom-measurer (the only browser part)
```

Rules added to the dependency check: stages import only `problem` and
`schema`; adapters import `ports`, `problem` and their engine; nothing imports
an adapter except entry points and the element's dynamic import.

### 4. Invariants

| #   | Invariant                                                                                       |
| --- | ----------------------------------------------------------------------------------------------- |
| I11 | Every stage is deterministic; equal input gives equal output (extends I10 to each stage)        |
| I12 | After _place_: no two node boxes overlap, every node lies in its group                          |
| I13 | Every `required` constraint holds in the result, or layout fails naming it                      |
| I14 | _Label_ returns the cheapest candidate; a remaining hard overlap appears in the report          |
| I15 | The report is a pure function of the resolved map; tests and diagnostics call the same function |
| I16 | `refine` never changes a node box or the view box                                               |

### 5. Engines and dependencies

| Package                                                | Role                                                          | Verdict                                                                                                                 |
| ------------------------------------------------------ | ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `@dagrejs/dagre` (MIT, maintained)                     | Placer, default in the browser                                | Keep; supports direction, weight, free edges by reversal                                                                |
| `elkjs` (EPL, maintained)                              | Placer for quality, sketches, nested nodes                    | Keep; the default is reconsidered with the report once hints exist (ADR 0022)                                           |
| `webcola` (MIT, 22.7 kB gzip, unmaintained since 2019) | Placer for relations                                          | Candidate; compared with a small solver (`@lume/kiwi`, 3.8 kB) plus our own overlap check                               |
| `libavoid-js` (LGPL, WebAssembly about 490 kB, beta)   | Router around fixed boxes                                     | Candidate; only as a separately loaded optional module; compared with WebCola's grid router and a simple channel router |
| `@hpcc-js/wasm-graphviz` (Apache-2.0, 636 kB gzip)     | Placer at build time; reference column on the comparison page | Reference first; an adapter only if the report shows a gain                                                             |
| OGDF, Tulip, Dia, Dunnart, yEd                         | —                                                             | Ideas only: no JavaScript build, or closed source                                                                       |

No engine is written here. All engines stay optional and are loaded only by
their adapter.

## Rejected

- Keep one port and fix each defect per adapter: the fixes of 0.2.0 show the
  cost, and hand layouts get none of them.
- One engine for everything: no engine does intent, relations, routing around
  fixed boxes and step numbers.
- Our own layered algorithm: decades of work exist in dagre, ELK and Graphviz.

## Order of work (0.3.0)

Each step is one pull request; steps 1–4 change no drawing except where the
report proves a defect is removed.

1. The report as a core function; visual checks and the comparison page use
   it; baseline from the hand-drawn maps.
2. `LayoutProblem` and the `Placer` port; dagre and ELK behind them.
3. `Measurer` port and `refine` in the browser.
4. The _label_, _loops_ and _shape_ stages replace the per-adapter fixes.
5. Derived constraints (order, main path, free edges) for dagre and ELK; new
   columns on the comparison page; decide the default engine again.
6. Stated hints in the source format (`sameRank`, `free`, `side`).
7. Relations: experiment (WebCola against a small solver; routers), then the
   adapter.
8. Sketches: `pin` as `preferred` with ELK; the book's hand positions as
   sketches, compared with the hand drawings.

0.2.0 is released first with the fixes already in review.

## Consequences

- ADR 0011's single `LayoutEngine` port becomes `Measurer`, `Placer` and
  `Router`; ADR 0021's levels become constraints; the open questions of 0021
  (routing after relative placement, overlap) are decided in step 7.
- Fixes for labels, numbers and loops apply to every engine and to hand
  layouts.
- The source format gains optional fields only; maps without them lay out as
  before.
