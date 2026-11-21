# Routing time and browser download

These measurements cover the current geometry prototypes, not production
routers. The channel candidate still lacks parallel spacing; neither candidate
places labels or step numbers. Size and speed cannot decide drawing quality.

## Routing time

Node 26.13.1, V8 14.6.202.34-node.40, Linux x64, Intel Core Ultra 9 185H.
The [environment record](timing/summary.json) includes the kernel, logical CPU
count, timestamp and both lockfile hashes. Times depend on the machine and its
load; there is no timing threshold or claim of statistical significance.

| Candidate | Maps / edges | Sum of map medians, ms | Median map, ms | Smallest map median, ms | Largest map median, ms |
| --------- | -----------: | ---------------------: | -------------: | ----------------------: | ---------------------: |
| Channel   |     29 / 260 |                  28.23 |          0.565 |                   0.098 |                  4.542 |
| libavoid  |     29 / 260 |                  20.63 |          0.618 |                   0.342 |                  1.912 |

Each map/candidate has one warm-up followed by five sequential calls. Candidate
order alternates across maps. Reports retain all five samples, their median,
minimum and maximum. The sum above is a sum of individual map medians, not the
median of five complete corpus runs. The median map is the middle of the 29 map
medians; it does not describe a particular input size.

The clock covers each synchronous adapter call: channel graph construction and
search, or libavoid router allocation, shape/connector registration, routing,
output conversion and router deletion. Module loading, WASM compilation and
initialisation, placement, input preparation/copying, geometry audits, output
comparison, reporting and disk writes are excluded. These are warm Node times,
not browser latency or cold-start measurements. Garbage collection may occur
inside a sample; no sample is removed or replaced.

Every warm-up is independently audited for exact ports, permitted sides and
unwanted node contact. Every measured result must exactly match its warm-up,
and every call must leave its input unchanged. Each report identifies the
prepared input and returned routes by SHA-256. Tests match these to the existing
geometry reports, so no faster but different route was accepted.

## Browser download

Pinned Rolldown 1.3.2 produces minified browser ESM. Gzip uses Node's level 9,
compressing each file separately. WASM is the package's unmodified binary;
"minified" applies to JavaScript only. Byte counts include the routing adapter.

| Candidate / asset                                  |   Bytes | Gzip bytes |
| -------------------------------------------------- | ------: | ---------: |
| Channel: implementation and adapter (`channel.js`) |   2,329 |      1,144 |
| libavoid: adapter (`avoid.js`)                     |     799 |        493 |
| libavoid: separately loaded JS (`libavoid.js`)     |  59,889 |     21,846 |
| libavoid: separately loaded WASM (`libavoid.wasm`) | 476,036 |    178,650 |
| libavoid: total                                    | 536,724 |    200,989 |

The channel ESM has no imports. The libavoid adapter keeps its `libavoid-js`
import external; an import map resolves it to the separate library ESM, which
requests its sibling WASM file. The total counts all three files. Nothing is
excluded simply because it is a dependency. Reports contain per-file SHA-256
hashes; unresolved imports or unexpected extra chunks fail the measurement.

These numbers exclude the host page/import map, HTTP headers, fonts, CSS, map
data, placement, shared input preparation, labelling, reporting and the player.
No licence files or source distribution are counted: this is runtime payload,
not a complete distribution or a conclusion about licence compliance. That
analysis is [recorded separately](licences.md), including the missing release
materials. The package and its size budgets are unchanged.

The browser check serves the exact hashed, minified files, checks the requests
for both library JS and WASM, and compares all 260 output routes per candidate
to Node in Chromium, Firefox and WebKit. It renders no drawings; quality and
visual acceptance remain separate work.

## Reproduce

From the repository root, after installing the locked root and experiment
dependencies and building the package, use Node 26:

```sh
node experiments/routing/timings.mjs /tmp/routing-performance
node experiments/routing/downloads.mjs /tmp/routing-performance
node experiments/routing/downloads.mjs docs/evidence/routing-experiment --check
node experiments/routing/download-browser.mjs /tmp/routing-performance
node --test experiments/routing/*.test.mjs
```

Run timings alone, without concurrent verification or browser jobs. Fresh
timings go outside the repository and are expected to vary. Tests validate
recorded sample arithmetic and route/input hashes, never equality with a new
timing run. `downloads.mjs --check` rebuilds and compares exact byte counts and
hashes without writing. Without `--check` it also writes browser assets under
`bundles/` in the chosen output directory; keep those outside the repository.

- `timing/<candidate>/examples/<engine>/<example>.json` and
  `timing/<candidate>/book/hand/<map>.json`: 58 reports, one per map/candidate.
- `timing/summary.json`: method, environment and separate candidate totals.
- `download/<candidate>.json`: two reports with browser asset counts and hashes.

The [decision report](decision.md) combines these figures with the quality
and browser results, including unfinished channel spacing and paint review.
Changed candidate implementations need new size and timing measurements.
