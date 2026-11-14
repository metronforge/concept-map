# ADR 0006: the format carries no book vocabulary

Status: open — decide in stage C

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

## To decide

Whether to do it before 1.0 only, and whether format 2 stays readable for
one release. Until then D1 is listed debt and the README says the layer
list is not stable.
