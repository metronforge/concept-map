# Size audit before 0.3.0

What each way of using the package downloads at first, in the published 0.2.1, on `main` before the audit, and after it. Modules that are loaded only on demand (the layout engines, the strict check) are not counted.

## Summary (size-limit, gzip)

| Bundle                  | 0.2.1 limit | Before audit | After audit | New limit |
| ----------------------- | ----------: | -----------: | ----------: | --------: |
| `<concept-map>`         |      40,650 |       48,996 |      45,231 |    46,231 |
| Player                  |       8,483 |       14,929 |      13,745 |    14,157 |
| Server rendering        |       4,188 |        4,229 |       4,229 |     4,355 |
| Schema validation (Zod) |      29,638 |       27,049 |      27,049 |    27,860 |
| Layout                  |      32,620 |       37,764 |      37,803 |    38,803 |
| Quality check           |           – |            – |       4,747 |     4,889 |
| Complete root API       |      39,159 |            – |      32,743 |    33,725 |

New limits follow AGENTS.md "Size limits": measured size plus at most 1 KB and at most 3%.

## What the growth since 0.2.1 is

Mostly features that every page with a map needs: SVG path parsing and segment geometry (one copy, shared by placement and the check), placement of labels and step numbers, measurement with the page's font, and the step panel model.

## What the audit removed

1. **The sans-serif font table from the browser (−2.2 KB in `<concept-map>`).** The table and the monospace advance were one module. The browser needs only the monospace advance; the table is for the layout engines, which load on demand. A bundler splits code by module, so the whole table landed in the first download. The advance now has its own module (`mono-metrics.ts`); likewise the measurement validation moved out of `graph.ts` into `measured.ts`.
2. **The full quality check from the player (−1.2 KB).** Deciding whether labels move to the step panel needs only the contacts of labels and step numbers. `checkLabels` computes exactly those (same shapes, thresholds and bands; a test compares it with `check` on all book maps and the examples); lanes, crossings and reading direction stay out of the player.

## What stays, and why

- **Two SVG path readers.** `model/path.ts` (end points for the token animation) and `layout/stages/paths.ts` (polylines with curves). Sharing one would make the model depend on layout, which the architecture rules forbid, and would grow server rendering; the duplicate is about 0.2 KB.
- **Zod in `<concept-map>` (about 25 KB, half the bundle).** The element validates every map it loads; this was the same in 0.2.1. Whether to move to Zod Mini is the author's decision, to be measured on a branch before the release.

## Module breakdown (minified bytes in the first download, esbuild metafile)

### `<concept-map>` (element.js)

First download, gzip: 0.2.1 41,614 B · before the audit 51,733 B · after 48,634 B.

| Module                |  0.2.1 | before |  after |
| --------------------- | -----: | -----: | -----: |
| `pkg:zod`             | 99,570 | 99,570 | 99,570 |
| `layout/font-metrics` |      0 |  6,301 |      0 |
| `dom/player`          |  5,727 |  5,267 |  5,267 |
| `render/panel`        |  3,287 |  3,329 |  3,329 |
| `render/svg`          |  2,877 |  2,937 |  2,937 |
| `layout/stages/plane` |      0 |  2,572 |  2,572 |
| `layout/stages/paths` |      0 |  2,211 |  2,201 |
| `dom/svgDom`          |  1,951 |  2,170 |  2,170 |
| `element/element`     |  1,947 |  1,947 |  1,947 |
| `dom/measureLabel`    |      0 |  1,941 |  1,941 |
| `dom/animator`        |  1,701 |  1,701 |  1,701 |
| `dom/geometry`        |  1,523 |  1,603 |  1,603 |
| `dom/panelDom`        |  1,273 |  1,583 |  1,583 |
| `model/frame`         |  2,363 |  1,474 |  1,474 |

### Player (MapPlayer, connectConcepts)

First download, gzip: 0.2.1 8,442 B · before the audit 15,321 B · after 14,080 B.

| Module                          | 0.2.1 | before | after |
| ------------------------------- | ----: | -----: | ----: |
| `dom/player`                    | 5,723 |  5,267 | 5,267 |
| `render/panel`                  | 3,287 |  3,331 | 3,331 |
| `layout/stages/plane`           |     0 |  2,581 | 1,642 |
| `layout/stages/paths`           |     0 |  2,218 | 2,218 |
| `dom/svgDom`                    | 1,949 |  2,171 | 2,171 |
| `dom/measureLabel`              |     0 |  1,942 | 1,942 |
| `dom/animator`                  | 1,701 |  1,701 | 1,701 |
| `dom/geometry`                  | 1,521 |  1,605 | 1,605 |
| `dom/panelDom`                  | 1,273 |  1,585 | 1,585 |
| `model/frame`                   | 2,361 |  1,474 | 1,474 |
| `layout/stages/drawn`           |     0 |  1,401 | 1,401 |
| `layout/stages/label-placement` |     0 |  1,392 | 1,391 |
| `model/flow`                    | 1,209 |  1,212 | 1,212 |
| `layout/stages/contacts`        |     0 |  1,166 |   779 |

### Server rendering

First download, gzip: 0.2.1 3,948 B · before the audit 4,310 B · after 4,310 B.

| Module                | 0.2.1 | before | after |
| --------------------- | ----: | -----: | ----: |
| `render/panel`        | 3,228 |  3,270 | 3,270 |
| `render/svg`          | 2,877 |  2,935 | 2,935 |
| `model/frame`         | 2,361 |  1,470 | 1,470 |
| `model/panel`         |     0 |  1,117 | 1,117 |
| `render/inline`       |   841 |    841 |   841 |
| `render/concepts`     |   817 |    817 |   817 |
| `render/panel-labels` |     0 |    217 |   217 |
| `model/panel-labels`  |     0 |    182 |   182 |
| `render/arrow-label`  |     0 |    170 |   170 |
| `model/labels`        |    25 |    139 |   139 |
| `model/state`         |    38 |     38 |    38 |
| `index`               |     0 |      0 |     0 |
| `<stdin>`             |     0 |      0 |     0 |

### Layout (layout, measureLabel)

First download, gzip: 0.2.1 34,521 B · before the audit 41,389 B · after 41,412 B.

| Module                          |  0.2.1 | before |  after |
| ------------------------------- | -----: | -----: | -----: |
| `pkg:zod`                       | 99,578 | 99,578 | 99,578 |
| `layout/font-metrics`           |  6,302 |  6,301 |  6,294 |
| `layout/stages/plane`           |      0 |  2,572 |  2,572 |
| `layout/stages/paths`           |      0 |  2,211 |  2,211 |
| `schema/references`             |  2,128 |  2,128 |  2,128 |
| `layout/resolve`                |  1,628 |  1,703 |  1,703 |
| `layout/stages/drawn`           |      0 |  1,400 |  1,400 |
| `layout/stages/label-placement` |      0 |  1,397 |  1,397 |
| `layout/graph`                  |    983 |  1,326 |    802 |
| `layout/stages/contacts`        |      0 |  1,157 |  1,157 |
| `schema`                        |  1,116 |  1,131 |  1,131 |
| `layout/stages/report`          |      0 |  1,013 |    911 |
| `layout/check`                  |  1,321 |    906 |    906 |
| `schema/content`                |    897 |    897 |    897 |
