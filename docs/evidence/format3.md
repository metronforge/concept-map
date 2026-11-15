# Format 3 verification

Task 0.2.0 item 2, based on `0b9380e`. The author reviews the PR before merge.
No layout engine, custom element or book repository was changed.

## Fixture and render parity

- All **23 book maps** are format 3, with the original hand geometry.
- **1263** rich-text leaves round-trip from the migrated inline text to exactly
  their original HTML through `renderInline`.
- Restoring only `format`, `spread`/`id`, removing the new `layers` record and
  rendering the inline leaves makes each fixture deeply equal to its original.
  This checks every remaining field, not just visible coordinates.
- Removing geometry from each migrated map also produces a valid source map.
- All **1050** frozen renderer-state hashes pass. `render-golden.json` is
  unchanged. Comparison normalizes only the exact layer-colour `style`
  attributes described below, separately in SVG and concept output. Panel and
  deeper HTML receive no normalization. Text, geometry, controls, attributes
  other than these colour references, and element order are unchanged.

Reproduce after building, from the repository root (base commit must be available):

```sh
node docs/evidence/format3-fixtures.mjs
npx vitest run test/unit/golden.test.ts
```

[Reproducible fixture check](format3-fixtures.mjs) ·
[Per-map counts and results](format3-fixtures.json).

## Explicit rendering and styling differences

1. Node and lane styles change from `var(--<layer>)` to
   `var(--cmap-layer-<id>,var(--cmap-layer))`. Hosts set the new layer input;
   the neutral fallback remains `#526a8a`.
2. Concept group styles use that same expression instead of `--pw-<layer>`.
   The old special case `app` → `test` is removed. On hosts without those old
   `--pw-*` properties, concept heading colour previously inherited and dot
   backgrounds were transparent; both now use the neutral layer fallback.
   This is the intended generic layer-colour contract of ADR 0006, not a
   change to the book's text or geometry. Hosts with distinct old app/test
   colours must choose the colour for their declared concept layer explicitly.
3. Frame outline and successful-code-line colour inputs become `--cmap-frame`
   and `--cmap-success`, replacing their coupling to runner/server layers.
   Neutral defaults are identical. Failure state colouring keeps `--cmap-fail`.

These are the only allowed differences. The PR description lists them too.

## Validation

- Schema/render tests cover source maps without geometry, required resolved
  geometry, format-2 rejection, arbitrary/undeclared layers, defaults, optional
  concept links, both generated JSON Schemas and inline escaping in every rich
  leaf. Tests were observed failing before the format-3 implementation.
- `npm run verify`: **passed (58 unit tests)**; formatting, lint, both TypeScript targets, dependencies,
  build, JSON Schema freshness, unit tests, API report, contract/complexity
  guards, size and package validation, demo build.
- Mixed-entry gzip size: **9.94 kB**, below the unchanged **10.71 kB** limit.
- `npm run test:browser -- --project chromium --project firefox`:
  **108 passed**. Includes a new computed-style test for layer colours on nodes,
  lanes and concept dots, and the player rejecting format 2.
- WebKit is validated by GitHub CI, which installs browser system dependencies;
  this workstation lacks the required `libavif.so.16`. CI result is linked in
  the PR. No local test result is represented as a WebKit pass.
- Independent review found no Critical/Important issues and independently
  verified the fixture comparison and frozen hashes. Its minor suggestion to
  distinguish the three panel inline leaves was addressed with an occurrence
  assertion.

API reports retain their existing CRLF line endings; use
`git -c core.whitespace=cr-at-eol diff --check` for whitespace verification.
The schema complexity exception was removed; schema helpers obey the normal
function/file budgets and retain the schema-only dependency boundary.
