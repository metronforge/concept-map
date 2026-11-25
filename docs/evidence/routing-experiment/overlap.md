# Arrows sharing the same line

After [ordered spacing](spacing.md), channel has 201 units of coincident
orthogonal routes, between libavoid’s 145.50 and the reference’s 486.00. This audit measures the shared runs that
the crossing count in `check()` excludes. It does not change that checker,
its thresholds, any route, or any earlier report.

| Routes             | Maps with shared runs | Edge pairs | Shared length | Retraced edges |
| ------------------ | --------------------: | ---------: | ------------: | -------------: |
| Current examples   |                 0 / 6 |          0 |          0.00 |              0 |
| Channel examples   |                 0 / 6 |          0 |          0.00 |              0 |
| libavoid examples  |                 0 / 6 |          0 |          0.00 |              0 |
| Current book maps  |                7 / 23 |         14 |        486.00 |              0 |
| Channel book maps  |                8 / 23 |         12 |        201.00 |              0 |
| libavoid book maps |                8 / 23 |         12 |        145.50 |              0 |
| Current total      |                7 / 29 |         14 |        486.00 |              0 |
| Channel total      |                8 / 29 |         12 |        201.00 |              0 |
| libavoid total     |                8 / 29 |         12 |        145.50 |              0 |

Neither candidate now shares exact orthogonal runs in the six examples.
Both retain shared runs in eight book maps. Channel keeps complete terminal
runs fixed; the [spacing report](spacing.md) lists their lengths and explains
why separating those stems requires extra bends near fixed ports.

## Method and limits

The audit parses each full edge path with the existing path parser in exact
vertex mode. It finds positive-length intersections of horizontal segments
on the same y coordinate or vertical segments on the same x coordinate.
It unions touching or overlapping intervals separately for each line and
edge pair, so adding a vertex or retracing a segment cannot multiply that
pair's reported length. Direction does not affect coincidence.

`sharedLength` sums those lengths over distinct edge pairs, in SVG user
units. If three edges share the same ten-unit run, that contributes three
pairs and 30 units. This is a pair-weighted measure, not the length of the
union of painted ink. `retracedLength` separately sums the portions traversed
more than once by each individual edge. All three corpus route sets have
zero retraced length; a synthetic retracing case exercises that check.

Point contacts, perpendicular crossings and moveto gaps contribute nothing.
Coordinates must be exactly equal: near-coincident lines, stroke widths,
markers and text are outside this audit. There is no new clearance threshold
or defect band. Curves use the parser's existing chord approximation; diagonal
chords are excluded. The reports disclose every excluded segment and its
length. The reference has 20 diagonal segments totalling 2103.07 units
(19 in examples, one in the book). Both candidates are fully orthogonal,
with zero excluded segments. The current-route overlap total is therefore
only an orthogonal comparison, not proof that its other lines never overlap.

Shared stems at fixed ports are included. This report does not declare them
avoidable, require zero overlap, or choose a minimum spacing. Separating
routes must preserve the exact ports and sides, avoid boxes, fit the available
channel width, and be checked again for crossings and annotation contacts.
Simply shifting whole paths would violate those fixed attachments.

The result meets the author’s shared-line target of at most twice libavoid.
It does not establish minimum visible clearance between strokes. It does not select libavoid: geometry, annotation defects,
browser text size, runtime download and licence obligations remain separate
parts of the comparison. The later [viewport change](viewport.md) moves two
routes without changing any shared spans; its local pictures are linked there.

## Files and reproduction

Run from the repository root after building, with Node 26 and the locked
experiment dependency installed:

```sh
node experiments/routing/overlaps.mjs /tmp/routing-overlap
node experiments/routing/overlaps.mjs docs/evidence/routing-experiment --check
node --test experiments/routing/*.test.mjs
```

`overlap/<candidate>/<input>/summary.json` records counts, lengths, the
reference-map hash and the audited path hash for one of the 29 inputs.
`<input>` is `examples/<engine>/<example>` or `book/hand/<map>`.
Each `pairs/<index>.json` records the two edge IDs and their shared spans;
`retraced/<index>.json` is reserved for individual-edge retracing, of which
this corpus has none. An x-axis span runs horizontally at y=`coordinate`;
a y-axis span runs vertically at x=`coordinate`.
Each candidate's top-level `summary.json` separates example and book totals
and records Node and both dependency lock hashes. The reports contain
one subject each and are at most 40 lines.

The runner checks every candidate's geometry independently before auditing
it. Its `--check` mode compares every expected report without writing files;
an altered span is an error. The later viewport change updates two path hashes
without changing shared-span measures. Quality, timing, download and browser
reports record that implementation separately.
