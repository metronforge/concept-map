# Routing after aligning boxes

The additional same-rank input compares stretched routes with channel routes
on the same aligned boxes. It does not replace or enlarge the original
29-map totals. The branch already contains main's alignment implementation
(`5df866e`); this comparison changes no solver or public package code.

Both dagre and ELK lay out `examples/same-rank/map.json` with default derived
intent and its required same-rank hint. The shared alignment pass produces
the reference boxes and stretched arrows. `prepare` discards route interiors;
channel receives those boxes, fixed terminals and the viewport bounds. Both outputs preserve
the viewport, nodes, lanes, frames and scenarios. Independent port/node audits
check every replacement route. The same fresh annotation pass used for the
original channel comparison runs after routing.

## Server results

| Placement | Routes    | Hard | Crossings | Bends | Length | Shared line | Outside viewport |
| --------- | --------- | ---: | --------: | ----: | -----: | ----------: | ---------------: |
| dagre     | Stretched |    0 |         0 |     2 | 317.83 |           0 |                0 |
| dagre     | Channel   |    0 |         0 |     4 | 355.04 |           0 |                0 |
| ELK       | Stretched |    0 |         0 |     2 | 370.50 |           0 |                0 |
| ELK       | Channel   |    0 |         0 |     2 | 370.50 |           0 |                0 |

Each row has four nodes and three edges. The unchanged `check()` confirms
the required alignment and a reading share of 1 for all three edges. Label,
step and line contacts are empty. The shared-line audit excludes diagonal
segments in the stretched dagre drawing; its report retains those exclusions.
The length measurement includes them.

Channel adds two bends and 37.21 units on dagre's placement. ELK's counts and
length match, but channel moves the preparation arrow's horizontal segment
from y=62 to y=84. These inputs show no quality gain
from replacing stretching and contain no shared runs to exercise spacing.
They remain useful regression inputs for the future routing pass.

One warm-up followed by five calls gives channel medians of 0.697 ms (dagre
placement) and 0.429 ms (ELK placement). Input preparation, annotation, audits
and rendering are excluded. Raw samples, hashes and environment are retained.
No timing for stretching is claimed: it occurs inside the alignment pipeline,
so timing a complete layout would not be a comparable routing-only measure.
After adding viewport bounds, channel is 2526 minified bytes / 1237 gzip bytes;
the original libavoid comparison remains 536724 / 200989 bytes.

## Browser results

Both route sets are measured after pinned fonts load in Chromium, Firefox
and WebKit, at 1280 and 390 px, through all four scenario steps and whole-map
mode: 24 drawings and 120 states. For each route set, all 60 states have zero
displayed hard contacts, no text below page size or above 1.25 times it, and
no horizontal overflow. Raw quality reports also have zero hard defects.
Boxes and routes remain fixed through browser refinement. This result is
limited to this small input; the original corpus's text-size failures remain.

The experiment's browser contact mapping now reads the report fields directly.
The rebase changed an internal helper from named pairs to plain lists, which
made the old harness crash. No checker threshold or contact rule changes.
Existing reports must still reproduce without being rewritten.

Local before/after pictures are in `/tmp/loop79-author-i1-pictures/`:
`{dagre,elk}-{current,channel}-{1280,390}.png`, Chromium, light theme, whole
map. They are not stored in this repository or uploaded.

## Files and reproduction

Use Node 26 and the locked dependencies, from the repository root:

```sh
npm run build
node experiments/routing/same-rank.mjs /tmp/routing-aligned
node experiments/routing/same-rank.mjs docs/evidence/routing-experiment --check
node experiments/routing/browser.mjs /tmp/routing-aligned --same-rank
node experiments/routing/browser.mjs docs/evidence/routing-experiment --same-rank --check
node --test experiments/routing/same-rank.test.mjs
node experiments/routing/downloads.mjs docs/evidence/routing-experiment --check
```

- `same-rank/{current,channel}/examples/<engine>/same-rank.json`: full quality
  report, bends, length and resolved-map hash for one drawing.
- `same-rank/overlap/<candidate>/examples/<engine>/same-rank.json`: exact
  shared-run and diagonal-exclusion audit for one drawing.
- `same-rank/summary.json`: separate two-map totals, clipping and input hash.
- `same-rank/timing/examples/<engine>/same-rank.json`: channel samples and
  audited input/route hashes; `timing/environment.json` records the method.
- `browser/<browser>/<candidate>/examples/<engine>/same-rank/<width>/`:
  quality, contact lists and scenario-state reports, in the existing format.
- `browser/same-rank-summary.json`: browser totals, font and lockfile hashes.

`--check` compares deterministic evidence without writing files. For timing
it checks stored sample arithmetic and current input/route hashes, rather
than comparing variable elapsed times. The original commands and reports
remain separate; see the [main README](README.md#files-and-reproduction).

Viewport containment now passes on the original corpus; ordered parallel
spacing remains unfinished. The author's target is not met; see [the decision](decision.md).
