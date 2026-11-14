# ADR 0007: packaging

Status: accepted (approved by the author by merging the pull request that set this status)

- ESM only, compiled by `tsc` to `dist/` with declarations and source maps;
  no bundler. The only consumers are bundlers and Node ≥ 22.
- `zod` `^4` as a peer dependency: the book and the library must share one
  copy because the book extends the library's schema. No other runtime
  dependency.
- Entry points: `.`, `./dom`, `./css`, `./resolved-map.schema.json`.
- MIT. Published to public npm from GitHub Actions by trusted publishing.

Rejected: dual CJS/ESM (no CJS consumer); bundling `zod` (two copies break
`instanceof` checks across the shared kernel).
