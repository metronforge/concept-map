# Zod Mini experiment: classic baseline

This is the comparison baseline, before rewriting any schema. It does not
measure Mini or recommend adopting it. The public schemas still use classic
Zod. A later experiment must compare against these files without replacing them.

Measured from `5df866ef975aea76f49ae6121e10aacc89167357`, with Node
24.12.0, locked Zod 4.6.7 and the repository's Size Limit configuration.
JavaScript sizes are minified gzip bytes; peers are bundled, and the component
entry excludes deferred downloads. CSS is separate.

| Consumer            | Classic gzip bytes | Mini gzip bytes |
| ------------------- | -----------------: | --------------: |
| Component           |             48,182 |    Not measured |
| Browser player      |             16,417 |    Not measured |
| Server rendering    |              4,385 |    Not measured |
| Schema validation   |             27,165 |    Not measured |
| Layout port         |             40,134 |    Not measured |
| Same-rank alignment |             39,497 |    Not measured |
| Quality check       |              5,554 |    Not measured |
| Complete root API   |             33,032 |    Not measured |

All eight existing budgets pass. These numbers describe complete consumer
bundles; subtracting the player from the component would not isolate Zod's cost.

## Compatibility reports

- `classic/sizes.json`: all eight Size Limit results, including unchanged limits.
- `classic/schemas.json`: byte lengths and SHA-256 hashes of generated source
  and resolved JSON Schemas, using the same options and trailing newline as
  `npm run schema:check`. Both equal the checked-in files byte for byte:
  18,138 and 23,051 bytes respectively.
- `classic/errors.json`: exact issue objects and error messages for a missing
  title, a numeric title, an unknown root key, an unknown layer, and a missing
  node reference, for both source and resolved maps.
- `classic/maps.json`: hashes of parsed outputs for all 23 original book maps,
  their geometry-stripped sources, and five source examples; also the complete
  defaulted outputs of a minimal source and resolved map. This checks structural
  parsing, not semantic validity or layout quality. No book edge is omitted.

Classic errors include `Invalid input: expected string, received undefined`,
`Invalid input: expected string, received number`, `Unrecognized key: "surprise"`,
and `Unknown layer: missing`. The missing node is accepted by the structural
schema and rejected by the separate `validateReferences` boundary with
`scenarios[0].steps[0].show: unknown node “missing”`. A Mini comparison must keep
these boundaries distinct.

The capture script imports JSON Schema conversion from `zod/v4/core`, which
does not initialize the classic English locale. Each invocation is a fresh
Node process, so the harness itself cannot hide missing Mini error translations
by importing classic Zod. The schema under test controls locale initialization.

## Reproduce without overwriting the baseline

Run from the repository root after installing the lockfile dependencies:

```sh
npm run build
npm run schema:check
mkdir -p /tmp/concept-map-zod
npm run --silent size -- --json | npx prettier --parser json > /tmp/concept-map-zod/sizes.json
node scripts/zod-compatibility.mjs schemas | npx prettier --parser json > /tmp/concept-map-zod/schemas.json
node scripts/zod-compatibility.mjs errors | npx prettier --parser json > /tmp/concept-map-zod/errors.json
node scripts/zod-compatibility.mjs maps | npx prettier --parser json > /tmp/concept-map-zod/maps.json
diff -ru docs/evidence/zod-mini/classic /tmp/concept-map-zod
```

Use `set -o pipefail` in shells that support it so capture failures are not
hidden by the formatting pipeline. An unchanged classic build produces no
diff. After the Mini rewrite, preserve and explain differences. Keep the two
checked-in JSON Schemas unchanged so `schema:check` proves byte parity.

## Still to measure

The next iteration can rewrite the schema implementation on the experiment
branch, then compare sizes, schemas, parsed defaults and errors. The final
report also needs the public extension migration (especially the book's generic
leaves), before/after snippets, and the private-validator alternative's size
and drift risk. Adoption remains the author's decision; this baseline alone
does not establish savings or justify a breaking release.
