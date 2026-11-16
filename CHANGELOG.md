# Changelog

## [0.2.1](https://github.com/metronforge/concept-map/compare/v0.2.0...v0.2.1) (2026-11-16)


### Bug Fixes

* update the package version in the README and examples on each release ([7e34d8c](https://github.com/metronforge/concept-map/commit/7e34d8cfb644a6b4a03480233faddac4e377e393))

## [0.2.0](https://github.com/metronforge/concept-map/compare/v0.1.1...v0.2.0) (2026-11-15)


### ⚠ BREAKING CHANGES

* Import MapPlayer, connectConcepts, Animator, Playback, FlowHooks and Geometry from @metronforge/concept-map/dom instead of @metronforge/concept-map. Maps remain format 3.
* maps must use format: 3, rename spread to id, declare layers, and replace HTML text leaves with plain text plus inline marks; format 2 is no longer read. Migrate host colours to --cmap-layer-<id>, --cmap-frame and --cmap-success; read step-panel text instead of html from derive(). See docs/FORMAT.md.

### Features

* add format 3 maps with generic layers and inline text ([0d7f7e1](https://github.com/metronforge/concept-map/commit/0d7f7e1aa64b2aa50b6b2a5b56b4367857dbfda5))
* add framework-free figures and a concept-map element ([b21d5f3](https://github.com/metronforge/concept-map/commit/b21d5f3b44be1b7531f18b64b10330e34f08ca4c))
* add layout() with dagre and ELK adapters for maps without coordinates ([192e609](https://github.com/metronforge/concept-map/commit/192e6098e9256f9e2a013aa07e83596ac4c721a2))
* add source-map validation and JSON Schema without geometry ([0d7f7e1](https://github.com/metronforge/concept-map/commit/0d7f7e1aa64b2aa50b6b2a5b56b4367857dbfda5))
* lay out maps from left to right with direction "right" ([9062033](https://github.com/metronforge/concept-map/commit/906203307645ecb60a34f439d1a46e0f2f039e45))
* load the selected layout engine only when needed ([db9880e](https://github.com/metronforge/concept-map/commit/db9880e669db16ac697915089fd7746dedfcbce1))
* report unknown references in source maps with their path and id ([192e609](https://github.com/metronforge/concept-map/commit/192e6098e9256f9e2a013aa07e83596ac4c721a2))


### Bug Fixes

* draw self-transitions as loops attached to their blocks ([cae043a](https://github.com/metronforge/concept-map/commit/cae043a4cec02bed2d93f841bfc9cadbf8e513f4))
* hide empty sources and close panel borders ([727c6c6](https://github.com/metronforge/concept-map/commit/727c6c681c0a18bb85116fa18910d18e60d60cfa))
* keep arrow labels beside lines and mask strokes beneath text ([b276296](https://github.com/metronforge/concept-map/commit/b27629632a5182dd8566e47ffd5967e3a66df503))
* keep maps readable at natural size and centered ([5805f55](https://github.com/metronforge/concept-map/commit/5805f55dca02aecfa1a7b4c9012f19bab5439d65))
* keep self-transition loops compact and clear of nearby blocks ([5bfd9ee](https://github.com/metronforge/concept-map/commit/5bfd9ee7417317d0bd1947c762128d4009eada13))
* **layout:** measure non-ASCII labels ([604bbff](https://github.com/metronforge/concept-map/commit/604bbfff72a442080d20e956e99da9103d7d091b))
* place ELK edge labels beside their arrows ([9062033](https://github.com/metronforge/concept-map/commit/906203307645ecb60a34f439d1a46e0f2f039e45))
* place step numbers using rendered label sizes ([f8d93d9](https://github.com/metronforge/concept-map/commit/f8d93d9cb50881341a1167e6ae55ba7246eaaa22))


### Performance Improvements

* reduce player and renderer bundles ([8dd663f](https://github.com/metronforge/concept-map/commit/8dd663fa9632df7bb73f953fa3cdffc2dc20bfc6))

## 0.1.1 — 2026-11-15

- First release from GitHub Actions through npm trusted publishing (OIDC),
  with provenance. No code change from 0.1.0.

## 0.1.0 — 2026-11-15

- Extract the format-2 concept-map player with file history from Illustrated
  Playwright; preserve behavior, DOM and rendered output.
- Add ESM/declaration builds, CSS contract, JSON schema, API report and guards.
- Record existing architecture debt and invariant counterexamples explicitly.
- Run standalone browser tests and frozen book-fixture regression tests.

Published by hand from 4c4bc77 to create the package on npm.
