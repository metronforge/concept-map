# Stage A extraction log

Approved task: metronforge-site-dev `81af868` (merged PR #145). Architecture and
ADRs 0001–0004, 0007, 0008 accepted; 0005/0006 remain open. Only stage A is in
this branch. Nothing from B or the C spike is implemented.

## Provenance and decisions

A fresh `git clone --no-local` of the approved book branch was filtered using
`git-filter-repo 2.47.0`. Included only `illustrated-playwright/src/lib/concept-map/`,
`src/styles/map.css`, the specified unit tests/fixtures and player browser tests.
Path renames produced `src/`, `css/concept-map.css`, `test/unit/`, `test/browser/`.
The extracted historical tip is `3d5f246`; original history/author attribution
remain reachable. No unrelated book files or other branches were published.

Ruling: preserve algorithm bodies and the existing flat schema/dom layout;
mechanical ESM import suffixes, necessary barrel exports and CSS host tokens
are packaging changes. Cost if wrong: revise the package interface before release.
ADR 0009 documents those choices and exact debt exceptions. No dependency
inversion or validation fixes are hidden inside the move.

Ruling: the target package contracts describe desired guarantees more strongly
than today's code. Preserve the current code and add executable counterexamples,
not fixes. Cost: public 0.1.0 requires trusted, reference-validating adapters.
DEBT.md lists D1–D13 and the precise I1–I9 status. The README states that rich
text is already HTML and that resolved-schema parsing is not sanitization.

Ruling: ATTW's JavaScript/type resolver excludes only `./css`, which is a
stylesheet. Publint, pack inventory and a built demo exercise that export.
Cost: CSS does not receive a fictional TypeScript API check.

## Guard coverage

- Dependency-cruiser: cycles, core/shell direction, model/schema type-only,
  schema external-dependency restriction. DOM-free TypeScript compile starts
  at schema/model/render; D4 keeps DOM types in the shell until B.
- API Extractor records the single stage-A mixed entry. Missing release tags
  and referenced internal type exports remain explicit A exceptions.
- Lint rejects any/default exports/enums, and core classes. Complexity checker
  limits files/functions to 200/40 lines, with exact non-growing legacy ceilings.
- Runtime dependency guard permits only the peer zod ^4. JSON schema freshness,
  CSS/documented-token equality, publint, ATTW and pack inventory run on CI.
- First mixed entry measurement: 9,738 bytes gzip with Zod external; budget
  10,712 bytes (ceil +10%). The second entry budget waits for B/D6.
- Stryker runs report-only, weekly/manual CI. First measured score 85.02% over
  828 mutants, 5m12s. No threshold is set until B and its model-based test.

## Tests, demos and visual oracle

The original model/render/animator tests moved. Authored YAML round-trip and
schema/ref checks stay in the book. Resolved test fixture was frozen using the
old authored adapter once; no authoring implementation moved into the library.
All 23 real maps were exported by the book script. Frozen pre-extraction
renderer hashes cover 1,050 map/scenario/step/mode combinations.

The built standalone Vite demo uses the packaged implementation. The named
`assets/player.js` entry exposes the facade for API tests; HTML may reference a
Vite-generated internal chunk with mangled exports, which is not the public API.
The demo supplies its own favicon and page shell. Initial test failures exposed
those two host omissions; production algorithms were unchanged.

Library unit suite: 48 tests pass (including the three final dependency guard probes). Chromium: 53 browser tests pass, including
23 DOM-contract pages and named I2/I8/I9 properties. All three browsers are
configured in CI. Firefox and WebKit downloads both fail locally with CDN 403
`Domain forbidden`; no claim of a local Firefox/WebKit pass. CI results remain
to be observed after push.

The unchanged book passed full verify: 210 browser tests, 4m7.939s wall time.
The book candidate installs the packed 0.1.0 tarball, imports the package and CSS,
retains book theme/spacing and authoring adapter, and moves generic tests out.
Screenshot and final candidate timing evidence is added below after comparison.

## Review size

This extraction exceeds 400 non-move lines because the task explicitly adds
package/release infrastructure, all architecture guards, standalone demo hosts,
contract/property tests, frozen fixtures and eight ADRs. Production algorithm
changes are absent; these concerns are kept in named files for review.

## Author handoff (required by TASK §4)

`metronforge/concept-map` exists, is publicly readable and accepts a dry-run push.
The registry returned 404 for `@metronforge/concept-map@0.1.0` during this task.
The book's final registry switch is therefore blocked on first publication.
A file: tarball candidate is used only locally; it is not a merge-ready dependency.

1. Merge reviewed `init`; create public npm organisation `metronforge` if needed.
2. On the author's machine, check out the reviewed 0.1.0 commit, run
   `npm ci && npm run build`, then `npm publish --access public` with 2FA.
3. Configure npm Trusted Publishing: GitHub `metronforge/concept-map`,
   `release.yml`, direct publishing. Release 0.1.1 within two days of setup.
4. Remove any bootstrap npm token. Subsequent releases use OIDC.
5. Resume book candidate: install registry `@metronforge/concept-map@0.1.0`
   exactly, rerun verify/pre-push and push `chore/concept-map-package`.

No npm publish, tag, release, merge or PR is performed by this task.

## Final book candidate evidence

The local tarball candidate passed full book verify: 210 browser tests, 4m18.498s
wall time, versus 4m7.939s before. These are single runs under differing load,
not a performance improvement claim. Generic player tests moved out, while
23-map smoke tests and book prose-callout tests were added; total browser count
happens to remain 210. All authoring/source checks stayed in the book.

Visual comparison captured 92 figure images: all 23 maps, 1280 light / 390 dark,
initial step / completed whole mode, same machine Chromium. Initial capture:
79/92 byte-identical. With explicit scroll-to-start: 80/92 byte-identical. A
repeat of that exact capture against the _same packaged build_: only 81/92
byte-identical. The residual colour/raster differences therefore also reproduce
without a code change (up to 14 channel levels in the same-build repeat versus
16 between builds). All phone images matched. No comparison threshold was
relaxed, and no claim of complete byte identity is made.

Ruling: retain unchanged rendering/CSS behavior and report this rasterization
limitation rather than changing styles to chase unstable screenshots. Cost:
strict 92/92 byte identity is not established. Computed fill/stroke/font/colour,
opacity and horizontal/size geometry for every element on all 23 desktop maps
are identical across builds; browser state tests and all 1,050 frozen renderer
hashes pass. Per-image counts and the same-build control are in docs/evidence;
raw images and capture scripts are in the handoff archive.

Ruling: do not push a book branch that depends on a machine-local tarball, or
invent a registry lockfile for an unpublished version. The tested candidate is
preserved as a patch and local working tree; author publication is the final
external prerequisite. Cost: a short registry-install/verify/push follow-up
remains after publication, exactly as TASK §3/§4 requires.

## Independent review

Fresh review found no production algorithm regression. One Important issue in
new guard configuration was fixed: the public barrel is no longer exempt from
external runtime checks, and bare Node builtins are detected via dependency
classification. Two negative probes failed before the fix and pass after it;
a positive schema-owned Zod probe also passes. Full suite includes these probes.

Deferred minor: declaration/JavaScript source maps reference source paths excluded
from the published tarball; source debugging/navigation may not find those files.
This does not affect runtime or declaration resolution. Embedding sources or
changing declaration-map policy is a follow-up, not an extra production change.
