# Keep channel routes inside the drawing

This report describes the stage before ordered spacing. Its numeric comparison
is historical; [spacing](spacing.md) records the current result. Order and
coupling commands still use independent paths so these diagnostics reproduce.

The channel search now receives the reference viewport alongside the fixed
boxes and ports. All 260 routes stay inside it. This completes the route-bound
part of the author's target; parallel spacing was still unfinished at this stage.

## Method and limits

The existing grid uses exterior tracks 16 units beyond the coordinate extremes.
When one would leave the viewport, its replacement is halfway between the
extreme and the corresponding viewport boundary. Every grid coordinate is
filtered to the closed viewport. Orthogonal segments between retained points
therefore stay inside it. Search still minimises bends first, then length.

Terminals keep their exact positions and permitted sides. An outside terminal
or a wall sealing the viewport produces a routing failure, never an escape
route. This says the constructed graph found no path, not that the geometry
is impossible. Small regression tests cover these refusals; all 31 placed maps
(the original 29 and both aligned examples) pass port/node and containment audits.

Only `retry` in book 2-3 and `clean_returned` in book 4-1 move. Their exterior
vertical segments move from x=422 to x=413 and x=-2 to x=7 respectively.
Each route shortens by 18 units. The latter no longer crosses `ready_server`
twice. Fixed boxes, terminals, scenarios and viewports remain identical.
At 390 px, `retry` gains one tight label/line contact in all 29 states per
browser. Nominal gaps are 0.217 font units in Chromium, 0.049 in Firefox and
0.050 in WebKit, each with uncertainty 0.024. It adds no hard defect. The
reports retain this narrower clearance without changing bands.
Libavoid receives the copied viewport field but does not use it; its routes
and quality measurements are unchanged. Input hashes change for both candidates.

## Original 29-map comparison

| Measure                   | Before channel | Bounded channel | libavoid | Author's limit |
| ------------------------- | -------------: | --------------: | -------: | -------------: |
| Hard defects              |              3 |               3 |        3 |              3 |
| Crossings                 |             19 |              17 |       23 |             23 |
| Routes outside viewport   |              2 |               0 |        0 |              0 |
| Pair-weighted shared line |        2654.25 |         2654.25 |   145.50 |         291.00 |
| Bends                     |            302 |             302 |      304 |              — |
| Route length              |       41234.99 |        41198.99 | 38762.99 |              — |
| Router gzip bytes         |           1144 |            1237 |   200989 |              — |

At this stage the target was unmet because shared line exceeded twice libavoid's value.
The two same-rank inputs retain identical route geometry and quality. Updated
[timings and downloads](performance.md) now identify the later spaced implementation.
No public package code, example, checker band or recorded baseline changes.

Containment here covers route centre lines only. Marker tips, strokes, glyphs
and annotation circles need a separate paint-bound review. Existing undersized
text and badge clipping remain recorded; this is not visual acceptance.

## Reproduction and pictures

Use the README's geometry, quality, overlap, download and browser commands
with Node 26. `node --test experiments/routing/channel-bounds.test.mjs` checks
containment and refusal. Reports were first generated outside the repository
and compared map by map before replacing candidate experiment measurements.
Original reference results and libavoid geometry were independently unchanged.

Local Chromium/light pictures are in `/tmp/loop79-author-i2-pictures/`:
`{2-3,4-1}-{before,after}-{1280,390}.png`. They show the same fixed drawings
before and after the bounded search, after font loading and browser refinement.
No pictures are committed or uploaded. Full state measurements, including
text-size failures, remain in the [book browser reports](book-browser.md).
