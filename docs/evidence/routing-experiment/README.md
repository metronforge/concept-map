# Routing around placed boxes

This folder currently records the reference drawings for the routing experiment.
Neither candidate has been measured yet; these numbers do not select a router.
The package, its drawings and its existing quality baseline are unchanged.

| Routes                                 |    Maps | Edges | Hard defects | Crossings | Bends | Route length |
| -------------------------------------- | ------: | ----: | -----------: | --------: | ----: | -----------: |
| Current example routes (dagre and ELK) |       6 |    34 |            0 |         1 |    45 |      8236.49 |
| Current book routes (hand)             |      23 |   226 |           14 |        19 |   262 |     35547.26 |
| Current routes, all inputs             |      29 |   260 |           14 |        20 |   307 |     43783.75 |
| Channel router                         | pending |       |              |           |       |              |
| libavoid                               | pending |       |              |           |       |              |

## Files and reproduction

Run from the repository root with Node 26 and the locked dependencies:

```sh
npm run build
node experiments/routing/baseline.mjs /tmp/routing-reference
node experiments/routing/baseline.mjs docs/evidence/routing-experiment --check
node --test experiments/routing/baseline.test.mjs
```

The first command for the experiment writes new reports outside the repository.
The second compares the checked-in reports without writing anything. It also
checks the Node version and lockfile hash recorded in the summary. Do not update
the existing quality baseline to make this experiment pass.

- `current/examples/<engine>/<example>.json`: one report for each of coffee,
  door and gcd, using the current default layout options for dagre and ELK.
- `current/book/hand/<map>.json`: one report for each of the 23 book fixtures,
  with all hand positions, routes, labels, numbers and edges preserved.
- `current/summary.json`: separate totals for the examples, book and full set,
  plus Node version and the dependency lockfile hash.
- `experiments/routing/inputs.mjs`: shared input loader for subsequent router
  measurements. The `source` of a book case is the resolved map, which `check`
  accepts directly; it is not passed through a layout engine.

Each map report contains the complete unmodified `check(source, resolved)`
result, including contact bands and involved IDs, required constraint verdicts,
crossings and reading shares. A SHA-256 of the parsed resolved map identifies
the exact geometry. The test compares every quality report with the existing
recorded baseline and verifies that measurement does not mutate its input.

## Measurement boundaries

Hard defects and contacts use the checker's default font table and unchanged
thresholds. They describe the whole map at native size, before browser label
refinement or visibility filtering. These are reference measurements, not a
claim that every hand drawing passes browser visual acceptance. Reading share
is retained per map, including the separate non-return and return measures;
there is no average share or combined quality score across maps.

Bends reuse the comparison script's direction-change count. Route length sums
Euclidean segment lengths in SVG user units, excluding gaps between subpaths.
Both use the checker's path parser, which approximates curves with 16 chords.
The full precision numbers are in JSON; the table rounds only for display.

Routing time is `null` for current routes: hand-authoring time is unknown and
the existing layout call combines placement, routing and other stages. It is
not a routing-only timing. Candidate timings must later use five measured
routing runs after warm-up, excluding placement and report generation.

Unlike the earlier engine comparison, this input set retains `timeout_outer`
in book map 2-1. It ends at frame `outer`. Future router adapters must account
for that frame endpoint and its geometry rather than silently omit the edge.

## Remaining comparison

Both candidates still need to route all 260 edges on these fixed boxes with
the same ports. Their reports must include routing-only timings, download
sizes, licence requirements and limitations. Parallel-edge spacing, self-loops,
frame endpoints and label/number placement need explicit treatment. Browser
checks and local pictures are required when candidate drawings are produced.
The author chooses the router after that comparison; this baseline makes no
production recommendation.
