# Fixed routes in three browsers

The three examples now have real-font measurements for the current routes and
both candidates, using both dagre and ELK box positions. Each drawing is mounted
in the real player at 1280 and 390 px, with every scenario step and each
scenario's whole-map view visited. Chromium, Firefox and WebKit each measured
36 drawings and 300 states: 108 drawings and 900 states in total.

These are experiment results, not visual acceptance. Both routers still need
work, and the reference drawings fail the same text-size requirement here.
Nothing in the package, example files, checker or previous evidence changed.

| Routes   | States | States with hard contacts | States below page text | States above 1.25× page text | Drawings with horizontal overflow |
| -------- | -----: | ------------------------: | ---------------------: | ---------------------------: | --------------------------------: |
| Current  |    300 |                         0 |                    291 |                            0 |                                 0 |
| Channel  |    300 |                         0 |                    291 |                            0 |                                 0 |
| libavoid |    300 |                         0 |                    291 |                            0 |                                 0 |

Each row combines the six placed examples, two widths and three browsers.
Contacts refer to the displayed state, including faint ghost shapes. Text sizes
refer to visible node titles and arrow labels; tags, lane titles and step digits
are not included. The page font is 16 px. All SVGs fit their hosts.

## What the numbers mean

The exact comparison counts any measured size below 16 px. Of the 291 states
per row, 45 are desktop GCD states whose minimum is less than 0.001 px below
16 px. These tiny differences are retained, not rounded into a pass. The other
246 states have a substantial shortfall: minima are about 10.54–11.82 px.
All 150 narrow states per row are in that latter group. The desktop GCD maximum
is about 19.05 px, below the 20 px upper limit. The full precision ranges are in
each drawing's report.

At 390 px, the player moves arrow labels to the panel for door with either
placement and for coffee with ELK placement. It keeps arrow labels in the
drawing for coffee with dagre placement and for gcd with either placement.
This selection is the same for all three route sets and all three browsers.
No alternative narrow layout is supplied: replacing boxes would stop this
being a fixed-box routing comparison.

The unfiltered `check()` reports still include labels that the player hides
in panel presentation, and all potential scenario badges. They contain zero
hard defects at 1280 px. At 390 px, their hard totals across the 18 drawings
per route set are 107 current, 152 channel and 148 libavoid. These are not
defects in the displayed states, and they differ between browsers. The reports
retain them; the displayed-state result does not overwrite the raw result.
Panel presentation cannot fix the undersized node titles.

## Method and limits

The harness uses the repository's pinned DejaVu Sans and DejaVu Sans Mono
files. It waits for `document.fonts.ready`, confirms both fonts loaded, and
waits two animation frames after each state change. Media settings are light
theme and reduced motion; the page has a 16 px font and 16 px body margins.
The player performs its normal DOM measurement, wrapping and annotation
refinement. The harness asserts that node, frame and lane geometry, viewports
and edge paths remain identical to the supplied drawing.

Raw quality is the unchanged `check(source, player.map)` with `domMeasurer`.
Displayed contacts use the same internal shape extraction, contact functions
and default judge as `check()`. They retain every node and route, exclude only
arrow labels whose computed visibility is hidden, and use the actual rendered
step circles. Node badges keep the checker's intentional exemption for their
own box. DOM paths, node rectangles, label positions and badge coordinates are
checked against the player's map and derived state on every visit. Each
browser also moves a badge onto a label and confirms both the mismatch and
contact defect are detected.

Rendered text size is computed CSS font size multiplied by the SVG's screen
transform. No checker thresholds, bands, uncertainty allowances or text-size
requirements are changed. Hard and tight contacts remain separate counts.
The per-state contact count does not include constraint verdicts; the complete
raw report retains those verdicts. The examples have no broken required
constraints in these results.

This pass measures the examples; [book results](book-browser.md) are recorded
separately with the same method. Neither pass inspects glyph
outlines pixel by pixel, clipping by the SVG viewport, marker paint, or every
piece of panel text. The checker uses its existing real-font rectangles and
uncertainty allowance. A zero displayed contact count is not proof of all
visual requirements. The text-size failures prevent that conclusion already.
Ordered spacing changes four example drawings. Local before/after pictures
are listed in [the spacing report](spacing.md#browser-evidence-and-local-pictures).
Raw channel narrow defects rise from 115 to 152; displayed hard contacts remain
zero because those labels move to the panel. This is not visual acceptance.

## Files and reproduction

After building with Node 26 and installing the locked experiment dependency:

```sh
npm run build
node experiments/routing/browser.mjs /tmp/routing-browser
node experiments/routing/browser.mjs docs/evidence/routing-experiment --check
node --test experiments/routing/*.test.mjs
```

The harness serves an in-memory bundle and fonts through Playwright's request
handler. It neither uses nor rebuilds the demo. It writes only the specified
output directory; `--check` compares without writing. Browser launch, runtime,
coverage, font-load and geometry failures fail the command. Measured drawing
defects are data, not suppressed assertions or claims of acceptance.

`browser/<browser>/<candidate>/examples/<engine>/<example>/<width>/` contains:

- `states.json`: input and refined-map hashes, browser version, every visited
  state, its presentation and hard/tight counts, distinct defect pairs,
  text-size ranges and failing-state counts, fit and overflow results.
- `quality.json`: raw report fields other than the label and step contacts.
- `labels-{labels,lines,boxes}.json` and `steps-{labels,boxes,steps}.json`:
  the corresponding raw contact arrays, split by subject to keep files small.
  Together with `quality.json` these reconstruct the complete raw report.
- `browser/summary.json`: coverage and outcome totals, lockfile and font hashes.

The reports remain split by subject and below the file limit. Router timing
and size were refreshed after spacing; this harness is excluded from the download.
The [decision report](decision.md) includes the comparison and recommendation
with the numeric spacing target met and paint-bound review unfinished.
[Production effort](production-readiness.md) is assessed separately.
