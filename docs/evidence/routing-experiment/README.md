# Routing around placed boxes

This folder records the reference drawings, shared fixed-port inputs and
initial geometry from both routers. [Shared annotation quality](quality.md)
now scores both candidates; these provisional numbers do not select a router.
The package, its drawings and its existing quality baseline are unchanged.
[Performance measurements](performance.md) now record five-run routing times
and browser downloads for these geometry prototypes.
[Licence assessment](licences.md) compares MIT with LGPL-2.1-or-later and
describes the source and replacement materials a browser distributor needs.
[Browser measurements](browser.md) cover all example states in three browsers;
they find no displayed hard contacts but retain text-size failures.
[Shared-line measurements](overlap.md) quantify coincident orthogonal routes
that crossing counts omit; channel parallel spacing remains unfinished.

| Routes                                 | Maps | Edges | Hard defects | Crossings | Bends | Route length |
| -------------------------------------- | ---: | ----: | -----------: | --------: | ----: | -----------: |
| Current example routes (dagre and ELK) |    6 |    34 |            0 |         1 |    45 |      8236.49 |
| Current book routes (hand)             |   23 |   226 |           14 |        19 |   262 |     35547.26 |
| Current routes, all inputs             |   29 |   260 |           14 |        20 |   307 |     43783.75 |
| Channel router                         |   29 |   260 |            3 |        19 |   302 |     41234.99 |
| libavoid                               |   29 |   260 |            3 |        23 |   304 |     38762.99 |

## Files and reproduction

Run from the repository root with Node 26 and the locked dependencies:

```sh
npm ci --prefix experiments/routing --ignore-scripts
npm run build
node experiments/routing/baseline.mjs /tmp/routing-reference
node experiments/routing/baseline.mjs docs/evidence/routing-experiment --check
node experiments/routing/ports.mjs /tmp/routing-reference
node experiments/routing/ports.mjs docs/evidence/routing-experiment --check
node experiments/routing/channels.mjs /tmp/routing-reference
node experiments/routing/channels.mjs docs/evidence/routing-experiment --check
node experiments/routing/avoids.mjs /tmp/routing-reference
node experiments/routing/avoids.mjs docs/evidence/routing-experiment --check
node experiments/routing/quality.mjs /tmp/routing-reference
node experiments/routing/quality.mjs docs/evidence/routing-experiment --check
node --test experiments/routing/*.test.mjs
node experiments/routing/avoid-browser.mjs
```

The commands without `--check` write new reports outside the repository.
The commands with `--check` compare the checked-in reports without writing
anything, including the Node version and lockfile hash in each summary. Do not
update the existing quality baseline to make this experiment pass.

- `current/examples/<engine>/<example>.json`: one report for each of coffee,
  door and gcd, using the current default layout options for dagre and ELK.
- `current/book/hand/<map>.json`: one report for each of the 23 book fixtures,
  with all hand positions, routes, labels, numbers and edges preserved.
- `current/summary.json`: separate totals for the examples, book and full set,
  plus Node version and the dependency lockfile hash.
- `experiments/routing/inputs.mjs`: shared input loader for subsequent router
  measurements. The `source` of a book case is the resolved map, which `check`
  accepts directly; it is not passed through a layout engine.
- `ports/examples/<engine>/<example>.json` and `ports/book/hand/<map>.json`:
  counts and a SHA-256 of each prepared candidate input, reproduced by
  `experiments/routing/ports.mjs`.
- `ports/summary.json`: totals for those 29 input audits.
- `experiments/routing/prepare.mjs`: prepares the same boxes and terminals for
  both candidates; it does not produce a new drawing.
- `channel-geometry/examples/<engine>/<example>.json` and
  `channel-geometry/book/hand/<map>.json`: route coverage, failures, bends,
  length and input/output hashes from the initial channel path search.
- `channel-geometry/summary.json`: totals for those geometry audits. These are
  not resolved maps and do not include labels or a `check()` quality report.
- `libavoid-geometry/`: equivalent geometry audits for libavoid, with its
  experiment lock hash in the summary. See the [notes](libavoid-geometry-notes.md)
  for configuration, results and browser checks.
- `timing/<candidate>/`: five samples and their median/range per map; the
  summary records environment, method and totals. See [performance](performance.md)
  for the measurement boundaries and reproduction commands.
- `download/<candidate>.json`: minified browser JS and separate WASM sizes,
  gzip sizes and hashes, verified against the actual files in all three browsers.
- `quality/<candidate>/`: per-map results and summary using the unchanged
  checker after shared annotation placement; see [quality](quality.md).
- `browser/`: real-font example reports for both widths and every state;
  see [browser measurements](browser.md) for files, limits and reproduction.
- `licences.md`: pinned licence/source inspection, distribution obligations,
  proposed separate-loading arrangement and remaining release checks.
- `overlap/`: shared spans and retracing audits for all three route sets;
  see [method, limits and reproduction](overlap.md).

Each `current/` map report contains the complete unmodified `check(source, resolved)`
result, including contact bands and involved IDs, required constraint verdicts,
crossings and reading shares. A SHA-256 of the parsed resolved map identifies
the exact geometry. The test compares every quality report with the existing
recorded baseline and verifies that measurement does not mutate its input.

## Shared ports

The 29 inputs contain 309 node boxes, 8 frame boxes, 260 connections and 520
terminals. There are 2 self-loops and 1 terminal on a frame. Of the terminals,
133 deliberately stop two units short of a box; the others touch the boundary.
Two terminals sit at corners. These facts are recorded per map, not inferred
from successful routing.

`prepare(item)` returns `{ id, nodes, frames, edges }`. Boxes keep their exact
coordinates. Each edge has only its ID and two terminals: the endpoint ID and
kind, exact point, permitted outward sides and gap to the boundary. A terminal
at a corner permits both adjacent sides. The destination's sides describe the
direction away from its box, so the arriving segment travels in reverse.
Ports are not snapped to the boundary: that would remove the book's arrow gaps.

The old paths supply only their first and last points. Interior vertices,
labels, step numbers, view boxes and measurement metadata are absent from the
router input. Tests replace every route interior and annotation position and
verify that the prepared input stays identical. Arrays are copied so candidate
code cannot change the reference drawings. Disconnected paths, unknown or
ambiguous endpoints, and terminals inside or not aligned with their boxes are
explicit errors; none occur in these 29 inputs.

Frames remain separate from node obstacles. They are annotation boundaries,
not filled rectangles or inferred groups: `showWith` does not mean containment.
The target frame's box and terminal are retained for routing `timeout_outer`.
Both candidate adapters must use this distinction and these same permitted
sides, including the two corner choices. Channel geometry tests exercise all
260 connections; libavoid geometry checks now exercise the same set.

## Initial channel geometry

| Geometry measure |    Result |
| ---------------- | --------: |
| Maps             |        29 |
| Routed edges     | 260 / 260 |
| Failed edges     |         0 |
| Bends            |       302 |
| Route length     |  41234.99 |

`routeChannel(prepare(item))` returns an ordered list of `{ id, points }` or
`{ id, failure }`. It never changes an input. For each edge, a rectangular grid
uses midpoints between consecutive distinct box boundaries and terminal
coordinates, the terminal coordinates themselves, and exterior tracks 16 units
beyond the extremes. Adjacent intersections connect only if the segment misses
every closed node rectangle. Contact is allowed only at that edge's own node
terminal; frame interiors remain passable. Terminal sides constrain departure
and arrival, including corners and gaps.

Dijkstra search retains incoming direction at each intersection and minimises
bends first, then length. This is the shortest route on the constructed graph,
not a claim of optimal routing over the entire plane. Immediate reversals are
forbidden so a self-loop cannot collapse into an out-and-back line. A missing
path is reported as a search failure, not proof that no geometric route exists.

Tests independently intersect every output segment with every node rectangle,
check exact ports and outward sides, and repeat all 29 maps to check determinism.
Small fixtures check a blocking box, an obstructed port, a same-port self-loop
and bend/length priority. The corpus includes both real self-loops and the frame
endpoint. All 260 edges route without unwanted node contact.

This is one part of the channel candidate. Edges are currently routed
independently: parallel segments can coincide, and the fixed exterior offset
does not reserve room for labels. Spreading parallel routes is still needed. Shared label and number placement
now assembles resolved maps and runs `check()`; see [quality](quality.md).
The shorter total length alone is not a quality improvement.
All reference maps remain identical.

## Measurement boundaries

Hard defects and contacts use the checker's default font table and unchanged
thresholds. They describe the whole map at native size, before browser label
refinement or visibility filtering. These are reference measurements, not a
claim that every hand drawing passes browser visual acceptance. Reading share
is retained per map, including the separate non-return and return measures;
there is no average share or combined quality score across maps.

Bends reuse the comparison script's direction-change count. Route length sums
Euclidean segment lengths in SVG user units, excluding gaps between subpaths.
Both use the checker's path parser, which approximates curves with 16 chords.
The full precision numbers are in JSON; the table rounds only for display.

Routing time is `null` for current routes: hand-authoring time is unknown and
the existing layout call combines placement, routing and other stages. It is
not a routing-only timing. [Candidate timings](performance.md) use five measured
routing runs after warm-up, excluding placement and report generation.

Unlike the earlier engine comparison, this input set retains `timeout_outer`
in book map 2-1. It ends at frame `outer`. Future router adapters must account
for that frame endpoint and its geometry rather than silently omit the edge.

## Remaining comparison

Both candidates now route all 260 edges on the same fixed boxes and ports.
[Libavoid geometry notes](libavoid-geometry-notes.md) record its configuration,
29 per-map reports, browser parity and attachment limitations. The channel
candidate still needs parallel spacing; both now have resolved drawings and
[server quality reports](quality.md) from shared annotation placement.
Their [initial timings and download sizes](performance.md) are recorded;
licence requirements are [documented](licences.md), with release preparation
still unverified. Parallel-edge spacing, self-loops,
frame endpoints and label/number placement need final review. Example browser
measurements now cover both candidates; book-map browser review remains.
The author chooses the router after that comparison; this baseline makes no
production recommendation.
