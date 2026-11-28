# Keeping clear annotations in place

Refinement now keeps labels and step numbers whose re-measured positions are
clear. The eligibility check includes painted text padding. Fixed annotations
remain obstacles for the annotations that need placement. The same rule applies
to hand drawings and automatic layouts, without a provenance flag or format change.

## Results

Baseline: `b50565a`, immediately before refinement used the fixed set.
Implementation: `23684fe`. The baseline already includes fixed placement support;
it does not use it in refinement. Reports were collected with the same dependencies.

- All 23 book fixtures: 19 moved annotations, each with a tight or defect contact;
  zero clear annotations moved. The two remaining hard defects are unchanged.
- Coffee, door and gcd with dagre and ELK: all six font-table refined outputs
  are byte-identical before and after the change. Quality and scenario-intent
  baselines remain unchanged.
- All 96 browser comparisons: no increase in hard defects and no new tight or
  defect contacts, for both the complete map and its visible presentation.
- Six browser reports change: gcd with dagre and dagre-plain at 390 px, in
  Chromium, Firefox and WebKit. `repeat:0:turn-1` and `repeat:0:turn-3` now stay
  where they were placed. All 1280 px reports are identical.

The book fixtures do not demonstrate unnecessary movement under font-table
metrics on the baseline. A separate regression test uses a clear diagonal repeat
number that previously moved four units; it now stays through refinement and
JSON serialization. Browser tests also cover painted text and late font loading.

## Files

- `book/<map>.json`: moved annotation IDs, old/new coordinates, independent
  contact witnesses before placement, and hard-defect counts after refinement.
  An empty movement list means every annotation stayed in place.
- `server/<example>-<engine>.json`: SHA-256 of each complete refined map before
  and after; comparison also asserts exact JSON equality before recording hashes.
- `browser/<browser>/<example>-<variant>-<width>.json`: hard-defect counts,
  newly introduced contact identities, moved IDs, newly kept IDs, presentation
  selection and hashes of the complete source reports. Gap changes alone are
  not new contacts; contact kind, participants and verdict band identify one.
- `summary.json`: counts and source revisions.
- `measure.mjs`: measures book movement and six server examples.
- `record.mjs`: validates comparisons and writes the small reports above. It
  rejects missing browser reports, new contacts, hard regressions, clear book
  movements and changes to server examples.

## Reproduce

Run from the repository root with dependencies and all three Playwright browsers
installed. Keep full intermediate output outside the repository. First collect
the baseline in an independent directory, without changing the working branch:

```sh
mkdir -p /tmp/annotations-before
git archive b50565a | tar -x -C /tmp/annotations-before
mkdir -p /tmp/annotations-before/docs/evidence/keep-authored-annotations
cp docs/evidence/keep-authored-annotations/measure.mjs /tmp/annotations-before/docs/evidence/keep-authored-annotations/
ln -s "$PWD/node_modules" /tmp/annotations-before/node_modules
cd /tmp/annotations-before
npm run build
node docs/evidence/keep-authored-annotations/measure.mjs /tmp/annotations-before.json
npm run demo:build
FONT_EVIDENCE_DIR=/tmp/annotations-browser-before npx playwright test test/browser/refine.spec.ts
```

Return to the current repository root, then run sequentially (building the demo
while a browser run is active can remove assets the browser needs):

```sh
npm_config_ignore_scripts=true npm_config_cache=/tmp/concept-map-npm-cache npm run verify
node docs/evidence/keep-authored-annotations/measure.mjs /tmp/annotations-after.json
FONT_EVIDENCE_DIR=/tmp/annotations-browser-after npm run test:browser
node docs/evidence/keep-authored-annotations/record.mjs /tmp/annotations-before.json /tmp/annotations-after.json /tmp/annotations-browser-before /tmp/annotations-browser-after /tmp/annotations-evidence
npx prettier --write /tmp/annotations-evidence
```

The npm settings avoid writes to Git configuration and the default npm cache in
a restricted workspace. Compare the generated JSON with this directory; these
reports are evidence, not acceptance snapshots to overwrite when a check fails.
Browser hashes require the same browser binaries and fonts as the recorded run.
The browser suite checks every scenario step and whole-map presentation after
font readiness, including container fit at 390 px.

Pictures from the implementation iteration are for the author only, outside the
repository: `/tmp/97-i3-pictures/gcd-dagre-390-{before,after}.png` and
`/tmp/97-i3-pictures/gcd-dagre-plain-390-{before,after}.png`. The 1280 px drawings
are unchanged; no new pictures were needed for this evidence-only iteration.
