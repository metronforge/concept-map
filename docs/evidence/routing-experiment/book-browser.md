# Hand-placed book routes in three browsers

This extends the [example browser comparison](browser.md) to all 23 book maps,
including the frame endpoint in 2-1. The same fixed boxes and ports are used for
current hand routes, channel routes and libavoid routes. Each map visits every
scenario step and each scenario's whole-map view at 1280 and 390 px in Chromium,
Firefox and WebKit. The run covers 414 drawings and 11250 states.

| Routes   | States | States with hard contacts | States below page text | Raw hard defects |
| -------- | -----: | ------------------------: | ---------------------: | ---------------: |
| Current  |   3750 |                       210 |                   3698 |               39 |
| Channel  |   3750 |                         0 |                   3493 |               25 |
| libavoid |   3750 |                         0 |                   3493 |               26 |

All drawings fit their hosts without horizontal overflow. No measured state
exceeds 1.25 times page text. Raw defect totals sum one complete `check()`
report per drawing; displayed-contact totals count states with any defect,
not the number of distinct defects. Required constraints hold in every raw
report. These are different measures and should not be subtracted from one
another.

The reference's displayed defects are two paths, `mk_page` and `shared`,
crossing the `apiCookies` node in book 0-1. They remain in all 35 states at both
widths in each browser: 210 states in total. The standard browser suite already
tracks these known hand-route defects explicitly; this experiment records
them without an exemption. Neither candidate has a displayed hard contact in
this run. Their raw defects remain recorded even when panel presentation
hides the affected arrow labels.

| Browser  | Current states below page text | Channel | libavoid |
| -------- | -----------------------------: | ------: | -------: |
| Chromium |                           1224 |    1173 |     1173 |
| Firefox  |                           1224 |    1147 |     1147 |
| WebKit   |                           1250 |    1173 |     1173 |

Each cell is out of 1250 states. Some failures are small rounding differences:
for book 3-1 at 1280 px the minimum is about 15.99944 px in Chromium and WebKit,
and 16.0000003 px in Firefox. Other shortfalls are substantial; the smallest
measured text is about 10.55 px. The reference also selects drawing labels for
book 5-1 at 1280 px in Firefox and WebKit but panel labels in Chromium, changing
which text enters this measurement. None of these differences is rounded into
a cross-browser pass. Text size still prevents visual acceptance for every
route set.

## What is being compared

The reference starts with its hand annotations; both candidates start with
fresh shared annotation placement. The real player then performs normal DOM
measurement, wrapping, refinement and selection between drawing and panel
labels. Differences cannot be attributed to routing alone. The book fixture
and libavoid routes are unchanged. The [viewport update](viewport.md) moves
two channel routes and refreshes their browser measurements.
At 390 px, book 2-3 gains one tight `retry` label/line contact per state in
each browser. Hard contacts are unchanged; the tighter clearance is retained.

The [example method](browser.md#method-and-limits) also applies here: pinned
DejaVu Sans and Mono, a 16 px page font, `document.fonts.ready`, light theme,
reduced motion, and two animation frames after each state change. The harness
asserts unchanged nodes, lanes, frames, viewports and paths. It also compares
rendered badges, label positions, node rectangles and paths to the player map
and derived state on every visit. The moved-badge probe is retained in every
browser.

Displayed contact counts include faint ghost shapes but exclude arrow labels
hidden by panel presentation. Raw `check()` reports retain hidden labels and
potential badges. Text sizes cover visible node titles and arrow labels;
they exclude tags, lane titles, step digits and panel prose. Every measured
size below page text counts as a failure, without rounding or a relaxed band.
A zero displayed contact count does not establish complete visual acceptance.

The harness does not inspect painted glyphs, marker tips, stroke bounds or
SVG viewport clipping. Route centre lines now stay in bounds; badge clipping
and incomplete paint review remain documented in
[production readiness](production-readiness.md). Fixed-box routing also does
not resolve undersized node titles. Local before/after pictures for the two
changed channel drawings are listed in the [viewport report](viewport.md).

## Files and reproduction

With Node 26 and the locked root and experiment dependencies installed:

```sh
npm run build
node experiments/routing/browser.mjs /tmp/routing-book-browser --book
node experiments/routing/browser.mjs docs/evidence/routing-experiment --book --check
node --test experiments/routing/*.test.mjs
```

Use a fresh output directory for a new measurement. `--check` compares reports
without writing; it does not remove or reject unrelated extra files. The
existing command without `--book` still checks the example reports unchanged.
Measurements serve an in-memory bundle through Playwright, without a demo
server. Drawing defects are recorded data, while missing fonts, changed
geometry, missing state coverage or browser errors fail the command.

`browser/<browser>/<candidate>/book/hand/<map>/<width>/` contains:

- `summary.json`: input and refined-map hashes, browser version, state count,
  font-size ranges, fit/overflow counts and an ordered manifest of report parts.
- `states/<part>.json`: scenario and step IDs, presentation, hard and tight
  contact counts, in visitation order, with at most ten states per file.
- `defects/<part>.json`: distinct displayed defect pairs over the visited states.
- `{labels,steps,lines}-<kind>/<part>.json`: unchanged raw contact records,
  with at most ten contacts per file. Empty lists have an empty manifest.
- `quality.json`: remaining raw `check()` fields. Recombine each group's lists
  in manifest order to reconstruct the complete report.

The book JSON reports are at most 72 lines. Manifest paths are relative to
`browser/`. `browser/book-summary.json` holds
coverage and outcome totals plus lockfile and font hashes. Indexed parts keep
long scenarios and contact lists within the experiment's 200-line file limit;
they do not truncate them. Tests reconstruct the full state and quality data
and verify that altered evidence is rejected without rewriting it.

The [decision report](decision.md) includes these results and records unfinished
parallel channel spacing and paint-bound review. Updated routing sizes and
timings are in [performance](performance.md); this browser harness is excluded
from the download.
