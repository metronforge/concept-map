# ADR 0004: four public contracts and their versions

Status: accepted (approved by the author by merging the pull request that set this status)

## Decision

The public surface is: the data format, the TypeScript API, the DOM
contract, the CSS custom properties (ARCHITECTURE §5).

- The TypeScript API is recorded by `api-extractor` in
  `etc/concept-map.api.md`. CI fails when the report is stale, so every
  change of the surface is visible in review.
- Package versions follow semver over all four contracts: a renamed class
  in the DOM contract or a removed custom property is a breaking change.
- The format has its own number (`format: 2`). A new format number is a
  major (or, before 1.0, minor) package release; the player rejects formats
  it does not know.
- Before 1.0 everything not listed in README as stable may change in a
  minor release.

Rejected: treating only TypeScript exports as API. The book's CSS and tests
depend on classes and attributes at least as much.
