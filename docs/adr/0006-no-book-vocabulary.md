# ADR 0006: the format carries no book vocabulary

Status: accepted for 0.2.0 (format 3). Decided by the first outside user:
a map about a coffee shop cannot be written with Playwright layer names.

## Context

Debt D1: `Layer` is a closed list of Playwright layers, the renderer emits
`--pw-*` variables and special-cases `app`, the map has a field `spread`.
A second user of the library could not describe its own layers.

## Proposal

Format 3:

- `layers` becomes a record in the map: `id → { label }`; nodes, lanes and
  concept groups refer to a layer id. Colour comes from
  `--cmap-layer-<id>`, which the host stylesheet sets.
- `spread` becomes `id`; `deeper` keeps `{ title, href, why }`.
- The book adapter maps its layers and `--pw-*` colours; authored YAML does
  not change.

## Decision

Format 3 as proposed, together with the source format of ADR 0011. Format 2
is not read by 0.2.0: the book's adapter emits format 3 when the book
upgrades.
