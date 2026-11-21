# Quality with shared annotation placement

These provisional results use the existing routes from both prototypes, with
one shared annotation pass. Channel routes still need parallel spacing. No
candidate is ready for production and these measurements do not select one.

| Drawing            | Maps | Edges | Hard defects | Crossings | Bends | Route length |
| ------------------ | ---: | ----: | -----------: | --------: | ----: | -----------: |
| Current examples   |    6 |    34 |            0 |         1 |    45 |      8236.49 |
| Channel examples   |    6 |    34 |            0 |         1 |    46 |      8470.99 |
| libavoid examples  |    6 |    34 |            0 |         1 |    46 |      8418.99 |
| Current book maps  |   23 |   226 |           14 |        19 |   262 |     35547.26 |
| Channel book maps  |   23 |   226 |            3 |        18 |   256 |     32764.00 |
| libavoid book maps |   23 |   226 |            3 |        22 |   258 |     30344.00 |
| Current total      |   29 |   260 |           14 |        20 |   307 |     43783.75 |
| Channel total      |   29 |   260 |            3 |        19 |   302 |     41234.99 |
| libavoid total     |   29 |   260 |            3 |        23 |   304 |     38762.99 |

## Method

`assemble.mjs` copies each reference map, replacing every route. Labels start
beside the longest segment using the existing `besideRoute` helper and fresh
10.5-unit mono font-table measurements. Their initial rectangles are clamped
to the reference viewport. Existing edge badges and scenario repeat badges
start at the new route's arc-length midpoint. The existing `placeAnnotations`
stage then places numbers and labels. Old label positions, badge positions,
route interiors and measurement metadata never seed this pass. Label text,
annotation presence, scenario meaning, nodes, frames and lanes are preserved.

Both candidates keep the reference viewport, so they have the same space for
annotation placement and exactly the same box and port coordinates. No route
is translated, shortened or shaped after routing. Candidate routes first pass
the independent port, direction and closed-node-rectangle audit. The unchanged
`check(source, resolved)` then measures the whole candidate drawing at native
size, with default thresholds and its own font-table measurement.

The current-route column retains the original labels and numbers; it is the
actual reference drawing, not an annotation-normalised control. The reduction
from 14 to 3 defects therefore cannot be attributed to routing alone. A fair
comparison between the two candidates uses the same annotation algorithm, but
that algorithm's seeds and cost choices also affect the results.

The three remaining hard defects for each candidate are arrow labels touching
node step numbers: `ma` in book 3-2, `releaseOne` in 3-3, and `throws` in 5-1.
They remain in the reports. The experiment does not fix the shared placement
stage or suppress any labels to improve these totals.

## Contacts and reading direction

Counts below retain the checker's separate contact categories. Each cell is
**tight / defect**; zero means there were no contacts in either band. Full
pairs, gaps, constraint verdicts and reading shares remain in each map report.

| Contact       | Channel | libavoid |
| ------------- | ------: | -------: |
| Label / label |   3 / 0 |    5 / 0 |
| Label / line  |  26 / 0 |   28 / 0 |
| Label / box   |  54 / 0 |   45 / 0 |
| Step / label  |   2 / 3 |    1 / 3 |
| Step / box    |  12 / 0 |   15 / 0 |
| Step / step   |   0 / 0 |    1 / 0 |
| Line / box    |   1 / 0 |   32 / 0 |

Reading reports are identical to the reference for all 29 maps and both
candidates: this checker measures progress between node centres, which do not
move. Reading share cannot distinguish paths around those fixed boxes.
Crossings exclude collinear overlaps, so the channel router's coincident
parallel segments are not penalised by that number.

## Viewport and browser limits

The checker does not report viewport clipping. The separate `outsideViewport`
field preserves it: channel edge `retry` in book 2-3 reaches x=422 in a
420-unit viewport; `clean_returned` in 4-1 reaches x=-2. Libavoid has no route
outside a reference viewport. These are geometry bounds, not paint bounds:
marker tips, stroke width and text overflow are not included in this audit.
Step circles can also clip: in book 0-1, channel badge `mk_browser` is centred
at x=0 and libavoid badge `server_app` at x≈418.5 in a 424-unit viewport.
Both circles have radius 8. The shared placement stage can retain an
unobstructed midpoint without checking the circle against viewport bounds.
Zero route overflows therefore does not mean an unclipped drawing.

These are server font-table reports, not proof of browser visual acceptance.
Real-font refinement, every scenario step, whole-map mode and narrow-screen
presentation still need candidate-specific comparison before the final
recommendation. Local pictures illustrate the example routes at 1280 px in
Chromium, light theme. They are not committed or uploaded.

## Files and reproduction

Run after `npm run build` with Node 26 and the locked experiment dependency:

```sh
node experiments/routing/quality.mjs /tmp/routing-quality
node experiments/routing/quality.mjs docs/evidence/routing-experiment --check
node --test experiments/routing/*.test.mjs
```

`quality/<candidate>/examples/<engine>/<example>.json` and
`quality/<candidate>/book/hand/<map>.json` contain one complete, unmodified
quality report, route metrics, input/route/resolved hashes and overflow IDs.
Each candidate's `summary.json` contains separate totals for examples and book
maps, hashes of both lockfiles, the Node version and all overflowing routes.
No timing is implied by `routingTimeMs: null`: routing-only five-run samples
remain in `timing/`. Assembly and reporting are excluded from those samples
and from the router-only download sizes. Neither router changed in this pass.
