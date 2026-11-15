# ADR 0017: comparable layout evidence, without choosing an engine

Status: comparison method for task 0.2.0 item 4; engine decision pending author review

## Input and presentation

Compare all 23 book maps plus an English coffee-shop map with Normal and Out of milk scenarios.
The coffee source declares `direction: right`; book sources retain the downward
default. The coffee hand reference is authored
independently. Both engines receive the same strict SourceMap: remove viewBox,
node/frame boxes, lane coordinates, edge paths/badges and label positions, and
repeat-badge positions. Preserve all semantic fields and validate references.
Each generated result must match the warm-up result across five repetitions.

The user explicitly permits excluding `timeout_outer` from map 2.1 while frame
endpoints await implementation (ADR 0016). Remove that edge and its step reference
from a copy in all three columns; do not change the book fixture. Assert that it
has no flow or repeat-badge references. Mark the exception on the page and in data.

Each column runs the real MapPlayer with the same pinned DejaVu fonts. It starts
in step mode and has its own scenario selector, step controls, Whole map mode,
token animation, call log and replay. Coffee includes explicit flows for both
scenarios. Shared buttons can switch all three columns to the same mode.
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
- **Label overlaps:** count edge-label rectangles intersecting node boxes and
  pairs of edge-label rectangles with positive overlap area. Exclude boundary
  contact. Use the layout font metrics and baseline at native SVG size; do not
  count node titles within their own blocks. Publish the involved IDs. Browser
  label fitting and scenario visibility may change what is visible.
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
resolved maps and MapPlayer, not layout engines. Raw result
JSON records commit, dirty state, date, lock hash, versions and machine details.

## Scope and limitations

The review explicitly requests fixing ELK label placement and adding optional
layout direction before the author chooses an engine. The adapters now pass
measured edge labels to ELK with real text and read its returned positions.
There are no retained warnings for the old shared label anchor.

Dagre's post-layout lane grouping and ELK's native partitions still differ.
Source frame boxes derive from showWith, which is not a complete containment
description; manual frames can differ substantially. Timing depends on the
machine. The overlap counts approximate text rectangles rather than exact glyph
outlines. They do not measure edge/node overlap or semantic grouping. No combined
score, ranking or default selection is generated.

## Publication

`npm run comparison:build` creates comparison-dist/. CI uploads it as an artifact
for reproducibility and deploys the comparison branch to GitHub Pages for direct
viewing without an archive. Pull-request builds never deploy; only an explicit
push/dispatch on docs/layout-comparison can update the preview. The Pages URL is
recorded in the PR. Keep generated assets out of the source branch and npm package.
Stop for the author's engine decision after publishing; do not begin integration.
