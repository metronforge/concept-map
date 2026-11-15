# ADR 0025: layout is a pipeline of stages with a shared problem description

Status: accepted (author, 2026-11-15), without Graphviz as a dependency: it
would add about 640 kB for a gain not yet shown. Its ideas are used; the
package is not.

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

| Tool                                    | Kind, licence              | What it does well                                                                                                                                                                                              | What we take                                                                    |
| --------------------------------------- | -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Graphviz dot                            | C, EPL                     | Layered drawings; edge labels are invisible nodes, so space is reserved for them; a 30-year-old vocabulary of author hints (`rankdir`, `rank=same`, `weight`, `constraint=false`, `ordering`, ports, clusters) | The hint vocabulary; labels reserved during placement; no dependency            |
| ELK layered                             | Java → JS, EPL             | Same pipeline with exchangeable phases; keeps the order the model was written in; "interactive" phases that start from existing positions; label side selection; self-loops; nested nodes; ports               | Engine for quality and for layout "from a sketch"                               |
| dagre                                   | JS, MIT                    | Small, fast layered layout                                                                                                                                                                                     | Default engine in the browser                                                   |
| yEd                                     | Java, closed               | Layout from a sketch; label placement as its own step: each label has candidate positions and the least conflicting one wins                                                                                   | Label placement as a separate stage with candidates and costs                   |
| OGDF                                    | C++, GPL                   | Every phase (ranking, crossing reduction, coordinates, routing) is a replaceable module with defined data in between                                                                                           | Stages with explicit contracts                                                  |
| Tulip                                   | C++, LGPL                  | Algorithms are plugins that read and write named properties of one graph                                                                                                                                       | Intermediate results are data, not hidden state                                 |
| Sprotty                                 | TS, EPL                    | The browser first renders invisibly to measure real sizes, then layout runs with them                                                                                                                          | Measure with the font that draws; estimates are never final                     |
| Adaptagrams: libcola, libavoid; Dunnart | C++, LGPL                  | Placement by constraints (alignment, separation, no overlap) and connector routing around obstacles are separate libraries; constraints survive editing                                                        | Placement and routing are separate ports; relations as constraints              |
| WebCola                                 | JS, MIT, last release 2019 | libcola in the browser: gaps, alignment, no overlap, flow direction; includes a grid router                                                                                                                    | Candidate adapter for relative placement                                        |
| libavoid-js                             | WebAssembly, LGPL, beta    | Orthogonal routing around boxes with nudging of parallel segments; used by draw.io and JointJS                                                                                                                 | Candidate router, loaded separately, never bundled                              |
| JointJS, draw.io                        | JS, MPL / Apache           | A router chooses the route points, a connector turns them into a line shape; anchors on shapes                                                                                                                 | Route (points) and path (shape) are separate steps; sides of a box as edge ends |
| Dia                                     | C, GPL                     | Hand placement with connection points on shapes                                                                                                                                                                | Edge ends may name a side of a box                                              |
| Cytoscape.js, sigma.js                  | JS, MIT                    | Layout engines are extensions; label style gives text a background and a margin                                                                                                                                | Halo under label text (done)                                                    |
| Mermaid, D2, PlantUML                   | Text to diagram            | One description, several engines                                                                                                                                                                               | Engine is a choice, the description does not change                             |
| TikZ, MetaPost, TeX, Cassowary          | Typesetting                | Relative placement, equations instead of coordinates, "badness" as a number to minimise                                                                                                                        | Relations in the source map; a quality report with a number per defect          |
| Structurizr                             | Java                       | One model, many views                                                                                                                                                                                          | Meaning and layout intent are separate parts of the source map                  |

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

| #   | Invariant                                                                                                                                                |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I11 | Every stage is deterministic; equal input gives equal output (extends I10 to each stage)                                                                 |
| I12 | After _place_: no two node boxes overlap, every node lies in its group                                                                                   |
| I13 | Every `required` constraint holds in the result, or layout fails naming it                                                                               |
| I14 | _Label_ returns the cheapest candidate; a remaining hard overlap appears in the report                                                                   |
| I15 | The report is a pure function of the source map and the resolved map and reads nothing a proposer produced; tests and diagnostics call the same function |
| I17 | Every status of relative placement comes with a witness that `check` accepts, for all generated systems                                                  |
| I18 | Scaling a map leaves its report unchanged                                                                                                                |
| I16 | `refine` never changes a node box or the view box                                                                                                        |

### 5. Engines and dependencies

| Package                                              | Role                                       | Verdict                                                                                                                 |
| ---------------------------------------------------- | ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| `@dagrejs/dagre` (MIT, maintained)                   | Placer, default in the browser             | Keep; supports direction, weight, free edges by reversal                                                                |
| `elkjs` (EPL, maintained)                            | Placer for quality, sketches, nested nodes | Keep; the default is reconsidered with the report once hints exist (ADR 0022)                                           |
| `webcola`, `@lume/kiwi`                              | —                                          | Not used: relative placement is solved by our own small solver (below)                                                  |
| `libavoid-js` (LGPL, WebAssembly about 490 kB, beta) | Router around fixed boxes                  | Candidate; only as a separately loaded optional module; compared with WebCola's grid router and a simple channel router |
| `@hpcc-js/wasm-graphviz` (Apache-2.0, 636 kB gzip)   | —                                          | Not used: too large for the project now. Ideas only (hint vocabulary, labels reserved during placement)                 |
| OGDF, Tulip, Dia, Dunnart, yEd                       | —                                          | Ideas only: no JavaScript build, or closed source                                                                       |

### 6. Relative placement without a dependency

Relations are linear constraints on box coordinates, one system per axis; box
sizes are measured before solving, so they are constants.

- **Difference constraints** are the base: `x_B − x_A ≥ c` ("B is right of A
  by at least the gap") and `x_B − x_A = c` (alignment, exact gap), an
  equality being two inequalities. Among all solutions the most compact one
  is taken: every coordinate as small as the constraints allow. For
  difference constraints this solution is unique and is found by the longest
  path in the constraint graph. A box right of two boxes of different widths
  lands behind the wider one, with no extra rule.
- **Derived positions** are computed afterwards from boxes already placed:
  midway between two boxes, equal spacing in a row.
- **Diagnostics**: a cycle of positive length means the relations contradict
  each other, and the error names them; a box no relation reaches is
  "not determined" unless an engine places the rest; two boxes that still
  overlap are reported by name.

This needs no general linear-programming solver and no dependency. If maps
ever need arbitrary linear constraints with priorities, a solver can stand
behind the same port.

### 7. Propose and check

The same author's Affine-Bundle Solver separates a fast, untrusted router that
proposes an answer from a strict checker that recomputes every claim from the
source data and never reads a number the router produced. Layout has the same
shape: engines and our own solver propose; a checker decides. The rules below
are taken from that design.

- **The checker reads only the source map and the resolved geometry.** It
  never reads what an engine or a stage says about itself. An adapter's
  statement "this constraint is supported" is a capability, not evidence: every
  `required` constraint is verified on the result (I13 is the checker's job).
  A change that lets a proposer's output feed the checker changes the
  soundness argument, not just the code.
- **Three operations, chosen by the function called, not by a mode:**
  `layout` proposes a resolved map; `check(source, resolved)` judges any
  resolved map, whoever made it — an engine, the relations solver, a hand
  drawing, an edited file; `explain` returns the witnesses. A successful
  `layout` does not mean the result was checked, and success never invents
  acceptance.
- **Refusal and result are different statements.** "The engine failed or ran
  out of time" says nothing about the map. "These relations do not determine
  the layout" and "these relations contradict each other" are checked facts
  about the map. They are different outcomes with different types, never one
  error class.
- **Status is part of the result of relative placement**: `determined`,
  `underdetermined`, `contradictory`. Relations are taken one at a time in
  the order written, and each gets a verdict: it adds information, it is
  redundant but agrees, or it contradicts — after which the state is closed
  and later relations are not judged. The final status does not depend on the
  order; which relation is called redundant does.
- **Every status carries a witness that the checker can verify without the
  solver:**

| Status          | Witness                                                            | Check                          |
| --------------- | ------------------------------------------------------------------ | ------------------------------ |
| determined      | the coordinates                                                    | substitute into every relation |
| most compact    | for each coordinate, a chain of tight relations back to the anchor | add the gaps along the chain   |
| contradictory   | a cycle of relations whose sum states `0 ≥ c` with `c > 0`         | add the relations of the cycle |
| underdetermined | a set of boxes that can shift together without breaking a relation | substitute the shift           |

The contradiction witness is the error message; the chain answers "why is
this box here".

- **Exact arithmetic instead of a refusal band.** Relations have coefficients
  ±1, so solving is additions and comparisons. Measured sizes are rounded up
  to a grid of 1/64 unit before solving; then double arithmetic is exact and
  no "cannot decide" outcome is needed in the solver.
- **Two thresholds where measurement is inexact.** The quality report judges
  overlaps of drawn text, where browsers differ by fractions of a pixel. A
  single threshold flips between browsers. Each check has a band: `clear`
  when the gap is at least the margin, `defect` when the overlap exceeds the
  tolerance, `tight` in between — reported as such, never rounded to either
  side.
- **Scale-free thresholds.** Margins and tolerances are fractions of the font
  size, and a test shows that scaling a map does not change its report.
- **The report is a profile, not a score.** Its numbers are separate facts
  about different defects. Their sum or minimum is not a rule for choosing an
  engine: hard defects decide first, then the author's eye.
- **Fields that are not reproducible** (layout time) are excluded from every
  comparison.

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
