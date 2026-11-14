# @metronforge/concept-map

A server-rendered SVG concept map with a browser player, step/whole modes,
keyboard controls and reduced-motion playback. MIT, ESM only, Node >=22.14;
Zod ^4 is a peer. Version 0.1.0 preserves the book's format 2 and behavior.

**Stage A limitation:** inputs must come from a trusted adapter. The resolved
schema validates structure, not cross-references or HTML safety. Rich-text
leaves contain already-rendered HTML. Do not pass untrusted JSON or HTML directly
to the renderers. The closed Playwright layer list is not stable before 1.0.
See [DEBT](docs/DEBT.md), including reproduced invariant counterexamples.

## Use

```sh
npm install @metronforge/concept-map@0.1.0 zod@^4
```

```js
// Server: resolvedMap comes from your trusted, reference-validating adapter.
import {
  ResolvedMapSchema,
  renderSvg,
  renderPanelParts,
  derive,
  initialState,
} from "@metronforge/concept-map";
const map = ResolvedMapSchema.parse(resolvedMap);
const frame = derive(map, initialState);
const svg = renderSvg(map, { frame, markerId: "example-arrow" });
const panel = renderPanelParts(map, frame);
// Insert svg and panel.head/panel.more into the DOM contract's figure shell.
// Embed JSON with JSON.stringify(map).replaceAll('<', '\\u003c').
```

```js
// Browser: the server has rendered the figure shell and embedded map JSON.
import { MapPlayer } from "@metronforge/concept-map";
import "@metronforge/concept-map/css";
const root = document.querySelector('[data-figure="map"]');
const player = new MapPlayer(
  root,
  JSON.parse(root.querySelector("[data-map-data]").textContent),
);
// When removing the view:
// player.destroy();
```

The complete executable shell is in `scripts/build-demo.mjs` and the client
entry in `demo/MapFigure.js`. Run `npm run build && npm run demo:build`, then
`npx vite preview --outDir demo-dist`. The demo is a host, not a second player.

Read [DOM.md](docs/DOM.md) for elements, classes, ARIA and lifecycle;
[CSS.md](docs/CSS.md) for every `--cmap-*` property. For example, set
`.map-ui { --cmap-bg: white; --cmap-fg: #202124; --cmap-accent: #285bb5; }`.
Keep the accessible status element and the book's existing text form when
integrating. No new text-form feature is introduced by this extraction.

There is one mixed entry `.` in 0.1.0 (D6). The target core / `./dom` split
belongs to 0.2.0. `./css` and `./resolved-map.schema.json` are also exported.
All four contracts (data, TypeScript, DOM, CSS) are versioned together;
anything not explicitly declared stable here may change in a pre-1.0 minor.
No contract is declared 1.0-stable yet. Format number and npm version differ.

## Development and provenance

```sh
npm ci
npm run verify
npx playwright install --with-deps chromium firefox webkit
npm run test:browser
npm run test:mutation # report only on stage A; weekly/manual CI
```

CI runs Node 24 and all three browsers. `npm ci` installs the pre-push hook;
it runs verify plus Chromium locally. A sandbox can supply
`PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium`. No hook bypass is needed.

History was extracted with git-filter-repo from metronforge-site-dev at
81af868, selecting only the moved player, CSS and tests. Existing source
algorithms were preserved; relative imports acquired Node ESM `.js` suffixes.
The 23 book fixtures are a one-time export. To reproduce in the book:

```sh
cd illustrated-playwright
node scripts/export-concept-maps.mjs /path/to/concept-map/test/fixtures/book-maps.json
```

`render-golden.json` freezes 1,050 pre-extraction outputs (SHA-256 of SVG,
panel, concepts and deeper output for each scenario/step/mode). It is not
regenerated automatically from this library. Package fixtures are regression
data; the book YAML and authoring adapter remain in the book.

## Release (author steps)

1. Merge reviewed `init` and create the public npm organisation `metronforge`.
2. First publication is from the author's machine: check out the reviewed
   0.1.0 commit, run `npm ci && npm run build`, then `npm publish --access public`
   with npm login and 2FA. Codex does not perform this bootstrap publication.
3. Configure npm Trusted Publishing for repository `metronforge/concept-map`
   and workflow `release.yml`; allow direct publishing. Publish 0.1.1 soon
   afterward (within two days for the first trusted-publisher use).
4. Remove any bootstrap npm token. Subsequent releases use GitHub Actions
   OIDC, no stored npm token. The author publishes a GitHub Release named
   `v<package version>`; all CI checks must pass before npm publish.
5. After 0.1.0 is on npm, the book installs exactly 0.1.0, replacing the local
   tarball used for pre-publication verification. Do not merge a file: dependency.

No tag or GitHub Release is created by the extraction task. Stages B/C wait for
stage A's merge and the decisions specified in the accepted architecture.
