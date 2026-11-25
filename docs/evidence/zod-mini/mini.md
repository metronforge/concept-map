# Mini rewrite: size and validation experiment

This is an isolated prototype, not a switch of the package's public schemas.
The checked-in implementation, public API reports, JSON Schemas and size limits
remain unchanged. `scripts/zod-mini-experiment.mjs` copies the working tree's
tracked and non-ignored files into a fresh temporary directory, links the installed
dependencies, and applies the patches here. It never writes Git state.

Measured from `7160674b6fe011c1c2d574e3ecde8df35202da5e` with Node
24.12.0, locked Zod 4.6.7 and the same eight Size Limit
consumers as the classic baseline. Values are minified gzip bytes with peers
bundled. The component excludes deferred downloads; CSS is separate.

| Consumer            | Classic | Mini, no locale | Mini, English | Saved with English |
| ------------------- | ------: | --------------: | ------------: | -----------------: |
| Component           |  48,182 |          30,999 |        32,108 |             16,074 |
| Browser player      |  16,417 |          16,417 |        16,417 |                  0 |
| Server rendering    |   4,385 |           4,385 |         4,385 |                  0 |
| Schema validation   |  27,165 |           9,972 |        11,053 |             16,112 |
| Layout port         |  40,134 |          22,973 |        24,088 |             16,046 |
| Same-rank alignment |  39,497 |          22,242 |        23,328 |             16,169 |
| Quality check       |   5,554 |           5,554 |         5,554 |                  0 |
| Complete root API   |  33,032 |          15,820 |        16,908 |             16,124 |

Every size limit passes in both variants. Keeping English saves 33.4% of the
component and 59.3% of the validation bundle. Loading English adds 1,109 bytes
to the Mini component and 1,081 bytes to validation. These are whole-bundle
measurements, not estimates obtained by subtracting unrelated consumers.

## Compatibility

Both generated JSON Schemas match the original bytes: source 18,138 bytes,
resolved 23,051 bytes. The prototype never regenerates them. All captured parsed
outputs match the classic baseline: 23 book maps, their source equivalents,
five source examples, and minimal maps with defaults. The existing render and
quality baselines are unchanged; no screenshots are needed for this experiment.

Without a locale, missing fields, wrong types and unknown keys produce
`Invalid input`. Issue codes, paths and other details stay available. Custom
unknown-layer errors and semantic reference errors retain their original text.
The English variant adds one initialization in `src/schema/primitives.ts`:

```ts
import * as z from "zod/mini";
z.config(z.locales.en());
```

All ten captured errors then match classic Zod exactly, including issue objects
and serialized messages. Each capture runs in a fresh process using the
locale-neutral core JSON Schema converter; importing classic Zod in a test or
host could otherwise hide this difference. Initialization changes the shared
Zod locale configuration, as classic Zod's import does today. Error class
identity and convenience methods are not covered by message equality.

The rewrite changes six schema files to Mini's functional API, including
`z._default(schema, value)`, `z.optional(schema)` and
`schema.check(z.minLength(n))`. Generic leaves use `z.core.$ZodType`, allowing
classic leaves as well as Mini leaves. Parsed `SourceMap` and `ResolvedMap`
types compile throughout the existing package without changing layout or player
code. This does not preserve the schema-building API itself.

One existing unit test demonstrates an actual API incompatibility:
`shared kernel still specializes text and link leaves` reads literal `.value`
and array `.element`. Mini has neither convenience property. The prototype's
`test-format3.patch` makes the same assertions through `_zod.def.values[0]`
and `_zod.def.element`; it retains the classic numeric leaf and its parse check.
It changes only the temporary test copy, not the repository's test or an oracle.
The first unadapted run had 1,058 passes, that failure, and an architecture probe
that exceeded its unchanged five-second timeout. The serial run avoids worker
contention; no timeout or acceptance threshold is increased.

The public schema types also change from classic to Mini types. API reports
are deliberately not regenerated here. A future adoption remains a breaking
proposal, even though the JSON format and captured errors agree. Full Mini
`npm run verify` is not claimed: the classic API report should reject it.

## Verification results

- Both variants: build and `schema:check` pass; all eight size budgets pass;
  fresh runs of the helper reproduce all four recorded reports exactly.
- English prototype: `npm test -- --maxWorkers=1` passes all 1,060 tests,
  including the unchanged rendering and quality baselines, after the temporary
  introspection adaptation described above.
- English prototype: `npm run demo:build` passes; `npm run test:browser` passes
  all 474 tests in Chromium, Firefox and WebKit, including example scenarios,
  steps, whole-map mode and narrow-screen checks.
- Patch safety: an already-applied patch is rejected with a nonzero exit status;
  fresh English and bare copies both apply successfully.

## Reproduce

Run from the repository root with lockfile dependencies already installed and
`patch` available. The script prints the new directory. Use `--bare` for the
no-locale variant; omit it for English.

```sh
experiment=$(node scripts/zod-mini-experiment.mjs)
cd "$experiment"
npm run build
npm run schema:check
mkdir -p reports/zod-mini
npm run --silent size -- --json | npx prettier --parser json > reports/zod-mini/sizes.json
node scripts/zod-compatibility.mjs schemas | npx prettier --parser json > reports/zod-mini/schemas.json
node scripts/zod-compatibility.mjs errors | npx prettier --parser json > reports/zod-mini/errors.json
node scripts/zod-compatibility.mjs maps | npx prettier --parser json > reports/zod-mini/maps.json
diff -ru docs/evidence/zod-mini/mini-english reports/zod-mini
npm test -- --maxWorkers=1
npm run demo:build
npm run test:browser
```

Use `set -o pipefail` so a failed capture cannot be hidden by formatting. For a
bare run, compare with `mini-bare` instead of `mini-english`. The unit/browser
compatibility run is for the English variant. The helper applies patches forward only with
zero fuzz and rejects conflicts or already-applied patches; do not accept stale evidence after source
changes. The temporary directory contains no `.git`; package checks there need
`npm_config_ignore_scripts=true` to suppress the Git-hook prepare script.

## Remaining decision evidence

The savings justify finishing the investigation, but do not yet justify adoption.
The book's actual schema-extension usage still needs a count and before/after
migration examples, including error-class checks. The alternative that keeps
classic public schemas and uses private Mini validation still needs a measured
bundle and an assessment of duplicate-validator drift. Neither is estimated by
this experiment. Keep classic public schemas until that comparison is complete
and the author selects an option.

The API spellings and locale behavior were checked against the installed
4.6.7 code and the official [Mini documentation](https://zod.dev/packages/mini)
and [error customization documentation](https://zod.dev/error-customization#internationalization).
