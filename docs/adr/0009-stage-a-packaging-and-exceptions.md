# ADR 0009: mechanical packaging and explicit stage-A exceptions

Status: accepted for the stage-A extraction; author reviews with `init`.

## Context

The approved task requires moving behavior unchanged while enforcing architecture
and naming counterexamples. Existing book code imports several source files
outside the old barrel. Existing source also exceeds the new complexity limits.

## Options

1. Refactor and tighten validation during extraction: rejected by stage A.
2. Ship subpath exports for every internal file: rejected; expands the public API
   and circumvents D6's planned split.
3. Keep the mixed barrel, add only existing functions/schemas used by the book,
   record exact exceptions and enforce non-growth. Chosen.

## Decision

- Relative source imports acquire `.js` suffixes for Node ESM; algorithms,
  data shapes and DOM markup do not change.
- The barrel additionally exports `mapSchema`, `ResolvedMapSchema`, `statusText` and `escapeHtml`: all already exist.
- Keep `schema.ts` and the existing flat `dom` files. The target folders and
  port split belong to B/D4; no empty ports or new adapter abstractions on A.
- CSS keeps selectors/order, internal layer aliases and measured-label token.
  Host colours/fonts become `--cmap-*` inputs; book `.pwc` spacing stays in the
  book. Functional grid/layout stays with the player because it supplies the
  control ordering. The renderer's `--pw-*` concept dots remain D1.
- Preserve D1–D6 and additional D7–D13 in DEBT. Complexity exceptions are exact
  measured ceilings in `complexity-exceptions.json`, not whole-file lint skips.
- API Extractor checks the public report, while missing release tags and
  internal types referenced by public signatures are explicitly deferred on A.
- The gzip budget is the first mixed-entry build with peer Zod external,
  plus 10%, rounded up. There is no fictional `./dom` budget before B.
- Tests stay in the book when they concern authored YAML or prose callouts.
  Resolved fixtures and pre-extraction render hashes provide a fixed oracle.

- ATTW checks JavaScript/JSON entry points; CSS is excluded from its TypeScript
  resolution analysis (it is a stylesheet, not a JavaScript module). Publint,
  pack inventory and the built demo check the CSS export.

## Consequences

The package is still a format-2 player with a trusted-input boundary. It is not
yet a generic format-3 library. An additional export affects the recorded API;
future split is the approved 0.2.0 change. Tightening any debt needs its own
reviewed change, never a silent behavior fix in this extraction.
