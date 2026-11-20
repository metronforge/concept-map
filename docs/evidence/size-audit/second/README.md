# Second audit (after hints)

Measurements use Node 26.13.1, the locked dependencies, and esbuild 0.28.0.
The first-audit source is `d14f7e0`; before this audit is `c8f6d6f`;
the current implementation is `bc587e8`. The before revision also includes
the internal relation solver, but none of these consumers imports it.
This records the audit so far. The size limits now use the full allowed margin.
Further savings remain open; these measurements do not claim the solver now
has enough room.

## Consumer sizes

Size Limit uses Rolldown and reports gzip bytes. These are the acceptance
measures; esbuild below explains module inclusion and has different totals.

| Consumer          | After first audit | Before second audit | Current | Saved |
| ----------------- | ----------------: | ------------------: | ------: | ----: |
| Component         |            45,231 |              48,236 |  48,157 |    79 |
| Player            |            13,745 |              16,494 |  16,417 |    77 |
| Server rendering  |             4,229 |               4,385 |   4,385 |     0 |
| Validation        |            27,049 |              27,165 |  27,165 |     0 |
| Layout            |            37,803 |              39,770 |  39,762 |     8 |
| Quality check     |             4,747 |               5,632 |   5,554 |    78 |
| Complete root API |            32,743 |              33,032 |  33,032 |     0 |

The retained change moves diagnostic sentences out of hard-defect counting
into the existing full-report module. Counting and descriptions share the
same ordered contact lists. Public reports, diagnostic text and ordering stay
unchanged. This saves less than 0.1 KB in any consumer and adds no module.

## Reset limits

Each limit is the measured gzip size plus `floor(min(1000, size * 0.03))`
bytes. This uses the full margin allowed by AGENTS.md, rounded down to whole
bytes. The largest increase from an existing limit is 984 B for layout;
none exceeds 1 KB. Resetting the limits does not reduce any download.

| Consumer          | Measured | Margin | Previous limit | New limit | Increase |
| ----------------- | -------: | -----: | -------------: | --------: | -------: |
| Component         |   48,157 |  1,000 |         48,277 |    49,157 |      880 |
| Player            |   16,417 |    492 |         16,543 |    16,909 |      366 |
| Server rendering  |    4,385 |    131 |          4,485 |     4,516 |       31 |
| Validation        |   27,165 |    814 |         27,860 |    27,979 |      119 |
| Layout            |   39,762 |  1,000 |         39,778 |    40,762 |      984 |
| Quality check     |    5,554 |    166 |          5,682 |     5,720 |       38 |
| Complete root API |   33,032 |    990 |         33,725 |    34,022 |      297 |

## Reports and measurement method

Each directory contains one JSON report per consumer: `component`, `player`,
`server`, `validation`, `layout`, `check`, and `root`.

- [first-audit/](first-audit/): the earlier implementation rebuilt with this
  audit's dependencies and measurement script.
- [before/](before/): the implementation before the retained change.
- [current/](current/): the retained implementation.

Each report lists the minified first-download total, its gzip total, and
minified bytes contributed by every input module. Gzip is measured per output
chunk and then summed; compressed bytes cannot be attributed independently to
input modules. Static imports are followed recursively, counting each chunk
once. Dynamic imports are emitted but excluded. No dependency is externalized.
Raw metafiles and emitted chunks are retained only in the temporary output
directory, since metafiles exceed the evidence-file line limit.
Package input paths are normalized to `node_modules/` for comparison across
source directories. Rebuilding the before revision in an extracted directory
reproduced every module contribution and minified total; its component gzip
was 51,754 B instead of 51,753 B. All emitted code matched after normalizing
hashed chunk filenames, and the other six gzip totals matched exactly.
Treat that one-byte variation as a build-path effect, not a saving.

| Consumer          | Rebuilt first audit: gzip | Before: gzip | Current: gzip | Current: minified |
| ----------------- | ------------------------: | -----------: | ------------: | ----------------: |
| Component         |                    48,566 |       51,753 |        51,676 |           161,249 |
| Player            |                    14,083 |       16,876 |        16,795 |            45,919 |
| Server rendering  |                     4,309 |        4,466 |         4,466 |            11,598 |
| Validation        |                    29,742 |       29,858 |        29,858 |           103,072 |
| Layout            |                    41,353 |       43,470 |        43,460 |           139,228 |
| Quality check     |                     4,839 |        5,763 |         5,682 |            13,739 |
| Complete root API |                    35,485 |       35,799 |        35,799 |           118,778 |

Rebuilt first-audit figures differ slightly from the historical esbuild table
in the parent README. Use the JSON reports for comparisons made with the same
script and dependencies; do not substitute these totals for Size Limit.

## What grew, and which consumers need it

Paths below omit `dist/` and `.js`. Numbers are minified module bytes, not
standalone gzip savings. See the JSON reports for every module's contribution.

| Modules                                                                                            | Feature and need in the first download                                                                                                                                                                                                                                                                                                                                           |
| -------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `dom/drawing`, `dom/svgDom`, `render/positions`, `render/svg`                                      | Update geometry without replacing live SVG nodes. Drawing updates add 1,164 B to the component and 1,168 B to the player. Shared positions add 279–283 B, including server rendering and the root API; these keep initial rendering and later updates aligned.                                                                                                                   |
| `dom/refine`, `dom/narrowLayout`, `dom/resize`, `dom/player`                                       | Fit both candidates, cache one width, reject stale requests, and refit after resize or fonts load. Refinement grows by 725 B in both browser entries; the cache adds 520–521 B and observation adds 247 B. These are eager even for resolved maps without a narrow callback. Their execution is conditional, but their download is not. Deferring them has not been implemented. |
| `dom/token`, `dom/animator`, `model/retarget-flow`, `model/flow`                                   | Preserve a running token when geometry changes. The token module adds 734 B while the animator shrinks from 1,701 to 1,310 B; retargeting adds 513 B, and flow grows by about 50 B. Browser playback uses them; the root API includes its exported flow calculations.                                                                                                            |
| `layout/stages/presentation`, `hard-check`, `constraints`, `contacts`                              | Choose wide, narrow or panel presentation from independent checks and retain the return-width rule. The player now needs line/box and lane checks as well as label contacts. These also belong in layout acceptance and the standalone checker. Diagnostic sentences are no longer needed for counting.                                                                          |
| `layout/stages/hints`, `layout/hints`                                                              | Verify sides and ranks and identify hints. The geometry checker adds 793–796 B. Both browser entries need these verdicts to reject invalid narrow geometry. The component additionally retains the unsupported-hint callback helper through shared chunks; the player removes it. Removing the verdicts would change which drawing is selected.                                  |
| `layout/stages/label-candidates`, `label-placement`, `contact-reduction`, `refine`, `layout/width` | Fit enlarged text at narrow widths and refine labels and numbers. Candidate generation grows by 163–164 B; placement grows by 167–176 B; contact reduction adds 430–438 B. Browser refinement and layout use these rules. The standalone checker independently measures contacts and does not need placement.                                                                    |
| `layout/intent`, `layout/stages/reading`, `layout/build-problem`                                   | Derive scenario order and return edges, and report whether the result follows them. Intent adds 798 B to layout and checking; reading grows by 478 B. Neither is in the initial component or player download.                                                                                                                                                                    |
| `schema/hints`, `schema/references`, `layout/index`, `layout/place`                                | Parse hints, validate referenced nodes and edges, and report named refusals. The hint schema adds 286–289 B to validating entries; reference checks grow by 523 B in layout. These consumers must validate their inputs. Resolved playback and server rendering still exclude Zod.                                                                                               |
| `element/input`, `element/layout`                                                                  | Supply narrow layout callbacks for source maps while retaining the original source. These grow by 49 B and 26 B respectively in the component. Engine code remains deferred.                                                                                                                                                                                                     |
| `layout/stages/paths`                                                                              | Shared path geometry grows by 34–44 B in layout and browser consumers. There is one layout path reader, used by checking and placement. The separate model endpoint reader remains for playback; sharing across those modules would violate the dependency rule.                                                                                                                 |

Other per-module differences of at most 10 B are minifier allocation changes
or small changes to callers of these features. The JSON reports retain them.
Zod remains the dominant component cost and is outside this audit's scope.
The sans-serif font table is still absent from both browser first downloads.

## Rejected extractions

- Splitting the layout entry from its implementation did not defer the report
  and grew layout by 476 gzip B.
- Isolating crossing geometry saved 409 B in the component but grew the
  standalone checker by 9 B. The player already removes crossing-only code.
- Moving the unsupported-hint callback helper saved 103 B in the component,
  but the best measured variant grew layout by 1 B.

None is retained. A bundler's shared chunk boundaries and compression can
make a smaller input module grow a consumer bundle, so all seven cases must
be measured together. Narrow fitting remains a candidate for further work,
with synchronous presentation, lifecycle and dependency constraints intact.

## Reproduce

Run from the repository with Node 26 and its locked dependencies installed.
Install esbuild in a temporary directory so it does not change the package:

```sh
npm install --prefix /tmp/concept-map-audit-tools --no-save --ignore-scripts esbuild@0.28.0
npm run build
npm run size -- --json
ESBUILD_PATH=/tmp/concept-map-audit-tools/node_modules/esbuild/lib/main.js \
  node scripts/size-audit.mjs /tmp/concept-map-audit-current
```

To reproduce an older implementation, extract its source without changing the
working branch, compile with the same dependencies, and pass that directory
as the script's second argument. For the first-audit reports:

```sh
mkdir -p /tmp/concept-map-audit-first
git archive d14f7e0 | tar -x -C /tmp/concept-map-audit-first
ln -s "$PWD/node_modules" /tmp/concept-map-audit-first/node_modules
node node_modules/typescript/bin/tsc -p /tmp/concept-map-audit-first/tsconfig.json
ESBUILD_PATH=/tmp/concept-map-audit-tools/node_modules/esbuild/lib/main.js \
  node scripts/size-audit.mjs /tmp/concept-map-audit-first-results /tmp/concept-map-audit-first
```

Use `c8f6d6f` instead for the before reports, with separate temporary paths.
Only the seven consumer JSON reports belong in the evidence directories;
keep the `*-metafile.json` files and bundles outside the repository.

Verification commands are `npm run verify` and `npm run test:browser`.
The retained implementation passed 842 unit tests and 450 browser tests in
Chromium, Firefox and WebKit. All 16 generated example maps and reports,
23 book reports and 96 real-font browser reports matched the audit baseline
byte-for-byte. No quality baseline, scenario-intent evidence, API report,
threshold or drawing changed, so no screenshots were made.
