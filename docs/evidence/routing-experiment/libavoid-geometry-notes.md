# Initial libavoid geometry

The isolated experiment pins `libavoid-js` 0.5.0-beta.6 as a dev dependency in
`experiments/routing/package.json`. Its lockfile records the package integrity.
The root package dependencies and its lockfile are unchanged. This code is not
published or exported by the package.

| Geometry measure |    Result |
| ---------------- | --------: |
| Maps             |        29 |
| Routed edges     | 260 / 260 |
| Failed edges     |         0 |
| Bends            |       304 |
| Route length     |  38762.99 |

These are geometry measurements, not a `check()` quality result. Labels,
numbers, crossings and reading share still need resolved drawings. Channel
geometry has 302 bends and length 41198.99, but neither length nor bend count
alone selects a router.

## Configuration and limits

`loadAvoid()` loads the separate WASM asset once. `routeAvoid(avoid, problem)`
creates one orthogonal router for a whole map, adds all node rectangles and
connections, processes one transaction and copies the returned points. A
`finally` block deletes the router and its owned objects. Every run starts with
a fresh router. Only `shapeBufferDistance` is overridden, at 2.5 SVG units;
penalties and nudging options use this pinned version's defaults.

Connections use exact point terminals, including the original arrow gaps.
Their direction masks contain every permitted outward side. Frames remain
passable annotations, with the frame terminal supplied as a point. No route is
copied from the reference, snapped to a box, or repaired after routing.

The buffer is a corpus-specific experimental setting, not a general solution.
A buffer of 4 made the two expanded boxes in book map 2-3 overlap across a
six-unit corridor: libavoid rejected `enabled_inert` and returned a straight
fallback. A buffer of 1 avoided that rejection but let 24 gapped destinations
arrive from the wrong side. The [upstream direction-flag contract](https://www.adaptagrams.org/documentation/namespaceAvoid.html)
applies to points inside a shape. A buffer of 2.5 encloses the two-unit gaps
while keeping that corridor open. Both failure cases have small regression
tests. Arbitrary gaps and narrower corridors will need a different attachment
strategy; this setting is not a claim of production readiness.

## Reproduction and independent checks

From the repository root, with Node 26 and the root dependencies installed:

```sh
npm ci --prefix experiments/routing --ignore-scripts
npm run build
node experiments/routing/avoids.mjs /tmp/routing-reference
node experiments/routing/avoids.mjs docs/evidence/routing-experiment --check
node --test experiments/routing/*.test.mjs
node experiments/routing/avoid-browser.mjs
```

`libavoid-geometry/examples/<engine>/<example>.json` and
`libavoid-geometry/book/hand/<map>.json` record one report per map: identical
prepared-input hashes, route hashes, coverage, failures, bends and length.
`libavoid-geometry/summary.json` records totals, Node version, the root lock
hash and the experiment lock hash. Failed routes are excluded from bends and
length; none are excluded in this run. Check mode reads without rewriting.

The independent audit checks finite orthogonal segments, exact endpoints,
outward directions and every segment's intersection with every closed node
rectangle. Only an edge's own node terminal may contact that node. The report
also retains libavoid's routing refusals, rather than accepting its fallback
as a successful route. Repeated runs must produce exactly equal routes and
leave the input unchanged. Both self-loops and the frame endpoint are included.

The browser check loads the browser JS entry and the separate WASM request in
Chromium, Firefox and WebKit. It routes all 29 maps in each and compares every
point and refusal with the Node result, then runs the independent geometry
audit. It does not render a candidate map or claim visual acceptance. The
published drawings and reference quality baseline remain unchanged; there
are no new pictures in this iteration.

Full quality reports, five-run routing timings, browser download sizes and
distribution obligations remain for the final comparison. The installed
package declares LGPL-2.1-or-later; this note does not resolve how a future
optional adapter would be distributed. No production router is recommended yet.
