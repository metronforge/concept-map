# Changelog

## [0.3.0](https://github.com/metronforge/concept-map/compare/v0.2.1...v0.3.0) (2026-11-28)


### ⚠ BREAKING CHANGES

* exported schemas are Zod Mini schemas. Use Mini's functional helpers to compose them and inspect validation errors through issues instead of testing for a classic ZodError.

### Features

* add a strict layout option that rejects drawings with hard defects ([31828b5](https://github.com/metronforge/concept-map/commit/31828b5810cee70833dbb423ceb9a6fe9ef493fa))
* add layout hints with checked arrow attachment sides ([cfff722](https://github.com/metronforge/concept-map/commit/cfff722d07ec985f8588452dcc780ac9082495fa))
* add typed layout errors and constraint verdicts ([b291370](https://github.com/metronforge/concept-map/commit/b291370de5d3aaeae28a79480af3c169a922039b))
* align boxes named by same-rank hints ([5df866e](https://github.com/metronforge/concept-map/commit/5df866ef975aea76f49ae6121e10aacc89167357))
* check SVG arcs and labels covered by node step numbers ([aef2827](https://github.com/metronforge/concept-map/commit/aef2827ad97d804d68c212fe8ee7636bfcc08abf))
* choose readable layouts for narrow screens ([acce6af](https://github.com/metronforge/concept-map/commit/acce6af04849d220df2de26f0c77781578f72321))
* explain why preferred layout hints cannot be applied ([5df866e](https://github.com/metronforge/concept-map/commit/5df866ef975aea76f49ae6121e10aacc89167357))
* export browser text measurement types ([82103cf](https://github.com/metronforge/concept-map/commit/82103cf29d10971b47550de8f250642cd0cb87c6))
* expose same-rank alignment errors and guards ([05b54e3](https://github.com/metronforge/concept-map/commit/05b54e3c23459b6d85e019ff01ad7b00a2c9a992))
* judge a laid-out map with a quality report ([31828b5](https://github.com/metronforge/concept-map/commit/31828b5810cee70833dbb423ceb9a6fe9ef493fa))
* lay out maps for a target text width ([acce6af](https://github.com/metronforge/concept-map/commit/acce6af04849d220df2de26f0c77781578f72321))
* lay out maps from sketches with pinned boxes ([fe0f4e4](https://github.com/metronforge/concept-map/commit/fe0f4e48dc528ba9fcda86511f141fe92e949950))
* lay out maps in the order their first scenario reads them ([e80d0d5](https://github.com/metronforge/concept-map/commit/e80d0d57374b53a3d3daf2da61e43cec6409fd44))
* measure labels with the page's real font ([82103cf](https://github.com/metronforge/concept-map/commit/82103cf29d10971b47550de8f250642cd0cb87c6))
* move crowded arrow labels into the step panel ([aef2827](https://github.com/metronforge/concept-map/commit/aef2827ad97d804d68c212fe8ee7636bfcc08abf))
* record text measurements in resolved maps ([82103cf](https://github.com/metronforge/concept-map/commit/82103cf29d10971b47550de8f250642cd0cb87c6))
* refine resolved labels and step numbers after fonts load ([82103cf](https://github.com/metronforge/concept-map/commit/82103cf29d10971b47550de8f250642cd0cb87c6))
* report forward progress separately from return arrows ([e80d0d5](https://github.com/metronforge/concept-map/commit/e80d0d57374b53a3d3daf2da61e43cec6409fd44))
* report required lane violations without throwing from check ([b291370](https://github.com/metronforge/concept-map/commit/b291370de5d3aaeae28a79480af3c169a922039b))
* report uncertain text contacts as tight ([82103cf](https://github.com/metronforge/concept-map/commit/82103cf29d10971b47550de8f250642cd0cb87c6))
* route free and aligned arrows around placed boxes ([05b54e3](https://github.com/metronforge/concept-map/commit/05b54e3c23459b6d85e019ff01ad7b00a2c9a992))
* validate maps with Zod Mini ([3f87640](https://github.com/metronforge/concept-map/commit/3f876402cbbba006c06edc85f18a63b6b95b0f18))


### Bug Fixes

* describe same-rank contradictions by source paths ([67b18e9](https://github.com/metronforge/concept-map/commit/67b18e9f6876604fc45bad7d89209f4e5fad3c6f))
* keep step numbers from covering each other ([a6e9e74](https://github.com/metronforge/concept-map/commit/a6e9e74fa884eda6a8c637eddcbe854dcdaa2eaf))
* place arrow labels beside their own lines ([a6e9e74](https://github.com/metronforge/concept-map/commit/a6e9e74fa884eda6a8c637eddcbe854dcdaa2eaf))
* reduce collisions between crowded arrow labels ([e80d0d5](https://github.com/metronforge/concept-map/commit/e80d0d57374b53a3d3daf2da61e43cec6409fd44))


### Performance Improvements

* keep diagnostic text out of playback downloads ([9e3a9de](https://github.com/metronforge/concept-map/commit/9e3a9de94a1642fd3756f21c086d04dbaca0c624))
* keep the font table and full check out of the first download ([d14f7e0](https://github.com/metronforge/concept-map/commit/d14f7e0d7ba5751cc58f2ee78b6142719a4d510b))

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
