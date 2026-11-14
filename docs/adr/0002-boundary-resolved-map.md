# ADR 0002: the boundary is the resolved map

Status: accepted (approved by the author by merging the pull request that set this status)

## Context

The book authors maps in YAML with references to Playwright sources and to
spreads; link titles come from pages. The player needs none of that.

## Decision

- The library accepts only a resolved map and validates it with
  `ResolvedMapSchema`.
- `mapSchema(leaf)` is a shared kernel: the book derives its authored schema
  from it, so the structure is defined once. It is public API and follows
  the format version.
- The book owns the anti-corruption layer (`authored-schema`, `resolve-map`,
  `get-map`) and the YAML.

Rejected: moving the authored format into the library (it would import the
book's world); a separate package for the schema (one consumer today).

## Consequences

- A format change is a library release plus an adapter change in the book.
- The library tests use exported resolved maps of the book as fixtures.
