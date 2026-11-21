# Router licences and browser distribution

Reviewed on 2026-11-20 against the installed, locked experiment dependency.
This is a distribution assessment for the experiment, not legal advice or
approval of a production release. No dependency or package licence changes.

| Candidate                                       | Licence                | Consequence for this MIT package                                                                                                                                               |
| ----------------------------------------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Channel prototype                               | Repository MIT licence | Retain the repository copyright and permission notice when distributing it. No third-party routing runtime.                                                                    |
| libavoid-js 0.5.0-beta.6, including JS and WASM | LGPL-2.1-or-later      | Keep the library's licence, notices and corresponding source available; preserve users' ability to replace or relink it. A separate download is only part of that arrangement. |

The channel implementation and our libavoid adapter are repository code under
[MIT](../../../LICENSE). The adapter calls the library through its exported
API. The library JS and WASM remain third-party assets; they do not become MIT
because our adapter or the surrounding package is MIT.

## Identity and source provenance

The [npm version metadata](https://registry.npmjs.org/libavoid-js/0.5.0-beta.6),
installed manifest and experiment lock all declare `LGPL-2.1-or-later`.
This report evaluates the version 2.1 option. The npm metadata identifies
source commit `83f6d3ea06b825decff175787a89d7221c2f4ea3`.

- [Package manifest at that commit](https://github.com/Aksem/libavoid-js/blob/83f6d3ea06b825decff175787a89d7221c2f4ea3/package.json): version and licence match the installed package.
- [Licence at that commit](https://github.com/Aksem/libavoid-js/blob/83f6d3ea06b825decff175787a89d7221c2f4ea3/LICENSE): byte-identical to the installed `LICENSE`; SHA-256 `6da7ddf40cfea6f568961825b14478e879875f6ad033fad57889ae5bd52103f4`.
- [WASM build script](https://github.com/Aksem/libavoid-js/blob/83f6d3ea06b825decff175787a89d7221c2f4ea3/tools/generate.py): compiles C++ sources and `embind/bindings.cpp` with `emscripten/emsdk:7.0.0`; fetches the author's Adaptagrams fork at `v1.0.9`.
- [Adaptagrams tag lookup](https://api.github.com/repos/Aksem/adaptagrams/git/ref/tags/v1.0.9): resolves to `4e6a54e11b9c5b8c6dc0226b404e29bb21eb20f7` at review time. Its [router header](https://github.com/Aksem/adaptagrams/blob/4e6a54e11b9c5b8c6dc0226b404e29bb21eb20f7/cola/libavoid/router.h) carries Monash University's copyright and the LGPL 2.1-or-later notice.
- [JS build script](https://github.com/Aksem/libavoid-js/blob/83f6d3ea06b825decff175787a89d7221c2f4ea3/build.cjs): bundles browser JS and copies the generated WASM into `dist/`.

The installed archive contains ten files: the manifest, README, licence and
seven `dist/` files (browser/Node JS, maps, declarations and WASM). It contains
no C++ sources, bindings or build scripts. JS source maps are not the complete
source for the WASM. The npm commit and build recipe locate the likely source;
we have not rebuilt it or proved source-to-binary correspondence. Do not claim
that these links alone complete a source distribution.

## What a distributor must provide

Under [LGPL 2.1, sections 0–6](https://www.gnu.org/licenses/old-licenses/lgpl-2.1.html):

- Preserve copyright and warranty notices, include the licence and prominently
  identify the library's use. Include its copyright when displaying others.
- Provide the complete corresponding library source, interfaces and build
  scripts. For downloadable binaries, section 4 allows equivalent source
  access from the same place. Preserve LGPL terms and date modified files.
- Permit modification for the customer's use and reverse engineering to debug
  those modifications. Section 6 permits other terms for the application.
- Meet a section 6 mechanism: 6(b) requires runtime use of a separate library
  that works when replaced by an interface-compatible modified version;
  6(a) supplies library source and application source/object material needed
  to relink. Section 6(d) allows equivalent download access to that material.

These conditions allow an MIT application; they do not relicense libavoid as
MIT. Merely executing the router is unrestricted. Ordinary route coordinates
do not copy library code, so distributing those results alone is different
from sending JS/WASM to a browser (section 0).

## Applying that to this experiment

The [download measurement](performance.md) produces `avoid.js`, `libavoid.js`
and `libavoid.wasm`. The import map selects the library JS; that JS requests
the separate WASM. Browser checks establish that this split loads and routes
correctly in all three browsers. They have not tested a rebuilt replacement.

Our proposed production arrangement is an optional external adapter with a
documented way to substitute the compatible library JS/WASM pair. A release
should demonstrate that substitution, including a locally served application
copy, rather than infer it from separate HTTP requests. The JS glue and WASM
may need replacing together. No production arrangement is selected here.

A concrete distribution would include the library notices/licence, exact
library sources and patches, bindings and build scripts, compiler/runtime
notice inventory, and rebuild/replacement instructions. Host those materials
alongside the binary downloads. For a source-and-relink arrangement, include
the application/adapter sources or relinkable material and its build inputs
as well. These are proposed deliverables, not files this experiment supplies.
Review the actual release arrangement before claiming LGPL compliance.

The current size totals count runtime bytes only. Source archives, notices,
licence text and rebuild tooling add distribution work and storage, even when
they are not downloaded on every page visit. Using a CDN or a dev dependency
does not by itself settle the obligations for a browser deployment.

## Reproduce the inspection

After `npm ci --prefix experiments/routing --ignore-scripts`, from the root:

```sh
cat LICENSE
cat experiments/routing/package-lock.json
cat experiments/routing/node_modules/libavoid-js/package.json
cat experiments/routing/node_modules/libavoid-js/LICENSE
sha256sum experiments/routing/node_modules/libavoid-js/LICENSE
find experiments/routing/node_modules/libavoid-js -type f | sort
curl -fsSL https://registry.npmjs.org/libavoid-js/0.5.0-beta.6
```

Check the pinned links above, not the upstream default branch. The experiment
lock pins npm archive integrity; `download/libavoid.json` pins the measured
browser bytes. A later dependency version needs a new inspection. The channel
candidate has the simpler distribution requirements. The
[decision report](decision.md) weighs that difference alongside quality and
the unfinished channel implementation; no release arrangement is approved.
