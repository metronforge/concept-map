# ADR 0017: comparable layout evidence, without choosing an engine

Status: comparison method for task 0.2.0 item 4; engine decision pending author review

## Input and presentation

Compare all 23 book maps plus a Russian coffee-shop map with the scenarios
«Обычный» and «Молоко закончилось». The coffee hand reference is authored
independently. Both engines receive the same strict SourceMap: remove viewBox,
node/frame boxes, lane coordinates, edge paths/badges and label positions, and
repeat-badge positions. Preserve all semantic fields and validate references.
Each generated result must match the warm-up result across five repetitions.

The user explicitly permits excluding `timeout_outer` from map 2.1 while frame
endpoints await implementation (ADR 0016). Remove that edge and its step reference
from a copy in all three columns; do not change the book fixture. Assert that it
has no flow or repeat-badge references. Mark the exception on the page and in data.

Render all three versions with the same library SVG renderer and pinned DejaVu
fonts. Initially reveal all nodes/edges without step numbering; scenario/step
controls apply the same derived visibility/current state, labels and step badges
to all three, using each variant’s badge geometry.
Each preview fits its own viewBox into the same window: this is not a common
physical scale. Provide native-size scrolling, separate SVGs and JSON downloads.

## Metrics

- **Crossings:** count distinct transverse intersection points per pair of
  different edges. Exclude path endpoints, tangencies, collinear overlaps and
  self-intersections. Intersections at interior vertices count only when the
  incident directions alternate around the point. Coincident segment intersections
  are deduplicated within each pair with a 1e-7 SVG-unit tolerance. A three-edge
  crossing can count three pairs. Do not claim this measures node/label overlaps.
- **Bends:** changes of direction between nonzero polyline segments, including
  U-turns; repeated points and straight intermediate vertices do not count.
- **Area:** viewBox width × height, including padding, in SVG user units squared.
- **Time:** median of five sequential complete layout() calls after one warm-up
  per map/engine. Include validation, metrics-based label sizing, engine execution
  and resolution. Exclude module import, rendering, serialization and disk writes.
  Alternate engine order across maps. Publish all samples, range and environment.
  Hand-authoring time is unknown, shown as a dash rather than zero.
- **Bundle:** standalone minified browser ESM exporting layout and the chosen
  adapter, including its engine and Zod; no external dependencies. Measure raw
  bytes and gzip level 9 using pinned Rolldown. No CSS, fonts, data or player.
  Size is per engine, repeated across maps for convenience. Hand layout has no
  corresponding execution bundle; mark it not applicable.

All current paths use absolute M/L/H/V commands. The measurement parser fails on
other commands rather than silently approximating curves. The page itself loads
precomputed SVGs and a small interaction script, not layout engines. Raw result
JSON records commit, dirty state, date, lock hash, versions and machine details.

## Scope and limitations

Compare current adapters without tuning or quality fixes. Dagre's post-layout
lane stacking and ELK's native partitions differ by design (ADR 0014). Source
frame boxes currently derive from showWith, which is not a complete containment
description; manual frames can differ substantially (ADR 0016). Record these
limitations rather than changing semantics during the comparison.

Timing is environment-sensitive and is not a benchmark across engines' supported
feature sets. The page's visual inspection is essential: the five requested
numbers do not measure text collisions, edge/node overlap or semantic grouping.
No aggregate score, ranking or default selection is generated. Coincident edge-label
anchors are flagged per map and retained in the results: for example, the current
ELK adapter returns all five coffee labels at the same anchor. This is evidence
about the current adapter/configuration, not a claim that ELK cannot place labels.

## Publication

`npm run comparison:build` creates comparison-dist/. CI uploads it as an artifact
for reproducibility and deploys the comparison branch to GitHub Pages for direct
viewing without an archive. Pull-request builds never deploy; only an explicit
push/dispatch on docs/layout-comparison can update the preview. The Pages URL is
recorded in the PR. Keep generated assets out of the source branch and npm package.
Stop for the author's engine decision after publishing; do not begin integration.
