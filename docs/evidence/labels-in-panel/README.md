# Arrow labels in the panel

The author approved numbered label rows beneath the step explanation at 390 px,
with whole-map labels grouped beneath each step title. Each row retains the
number of its step. The player selects this presentation only when the refined
map's quality report contains a hard arrow-label contact.

## Reproduce the browser checks

After rebasing onto main at `a6e9e74`, `npm run verify` passed with 418 unit
tests. The full `npx playwright test` run passed all 354 tests across Chromium,
Firefox and WebKit.

```sh
npm run build
npm run demo:build
npx playwright test test/browser/panel-labels.spec.ts test/browser/panel-label-compatibility.spec.ts
```

Result: 54 tests passed in Chromium, Firefox and WebKit. Each browser measures
with real fonts after `document.fonts.ready`, visits every step of every scenario
and whole-map mode, reads the visible SVG labels, and checks that drawing. It
also verifies panel text and order, fixed boxes, lanes, frames, routes and view
boxes, and absence of horizontal page overflow.

| Maps                        | Widths          | Presentations per browser | Hard arrow-label contacts |
| --------------------------- | --------------- | ------------------------: | ------------------------: |
| Coffee, dagre and ELK       | 1280 and 390 px |                        32 |                         0 |
| Door, dagre and ELK         | 1280 and 390 px |                        32 |                         0 |
| GCD, dagre and ELK          | 1280 and 390 px |                        36 |                         0 |
| All 23 hand-drawn book maps | 390 px          |                       625 |                         0 |

That is 725 presentations per browser, 2,175 across the three browsers. The
additional regression cases check restoring the drawing after widening, inline
code/emphasis/strong marks, preserved state, focused whole-map step controls,
flow logs and highlights, SVG arc and empty-stroke routes, and node step numbers
covering labels. Unit tests cover repeated arrows, multiple labels per step,
empty labels, escaping and the hard/tight distinction.

## Existing geometry and reports

The fallback changes only label visibility and panel content. Refinement still
owns label anchors and number positions; the new presentation does not move
boxes, routes, lanes, frames or the view box. Existing number-number and
number-box defects are outside this change and remain reported.

The quality-baseline JSON files and resolved example hashes from main
(`a6e9e74`, shared annotation placement) remain unchanged by this pull request. The checker now includes node step numbers in arrow-label contacts.
This adds three tight contacts to the font-table book reports: `probe_ready`
with `node-step:3:the-default-readiness-deadline-e` on 4-1 (gap 0.11 em), and
`deadline` with `node-step:0:the-final-wait-repeats` and
`node-step:3:after-failed-tries-both-wait-100` on 5-1 (both −0.024 em).
The baseline test asserts these additions explicitly; every old contact and
hard-defect count stays equal. No threshold or visual assertion was relaxed.

Invoking the checker during playback must preserve supported SVG paths. Arc
commands now use the SVG endpoint-to-centre conversion and 16 chords, like the
existing curve approximation. A path with no stroke contributes no segments.
Tests cover both sweep directions, the large-arc flag, rotation, undersized
radii, degenerate arcs and resetting smooth-curve controls.

## Shared browser geometry after rebase

Both consumers use the same parser and segment geometry:

- Placement: `label-placement.ts` imports `paths.ts` and `plane.ts`.
- Panel selection: `dom/refine.ts` calls `check()`; `drawn.ts` imports
  `paths.ts` and `contacts.ts` imports `plane.ts`.

A Rolldown module inventory for both `dist/dom/index.js` and `dist/element.js`
contains exactly one copy of each shared module. Arc support lives behind the
same `paths.ts` entry, so neither consumer adds a separate parser.

The old resize fixture now fits at 390 px because shared placement clears its
label. The replacement leaves a 16-unit corridor between two boxes: wide-screen
text fits, while narrow-screen text cannot fit even after placement. All original
fallback, restoration, inline-mark, accessibility, state and focus assertions
are retained and checked in all three browsers.

## Pictures

Before the rebase, Chromium before/after pictures were captured at 1280 and 390 px in light and
dark host themes. Only changed pairs are included: coffee/dagre and door/dagre
at both widths, coffee/ELK and door/ELK at 390 px. GCD and the remaining wide
pictures are pixel-identical, so they are omitted. The 24 PNGs and a comparison
HTML index are kept outside the repository in `before-after.zip` for the
author. They are not uploaded to GitHub and do not hold up review; no
screenshot-only test is committed.

## Package size

The author approved the affected budget increases. Each new limit is the
measured gzip size plus `min(1000, floor(size * 0.03))` bytes, so the margin is
at most 1 kB and at most 3%, rounded down to whole bytes. The player now carries
the independent quality checker; it still imports no engine and adds no runtime
dependency. The checker uses its existing mono font metrics directly, avoiding unused proportional font
tables in the player. Panel derivation was separated from map geometry so the
existing complexity limits did not need increases.

The starting limits below are from main at `a6e9e74`. Only the four exceeded
limits rise; validation, standalone checking and the complete root API retain
main's existing limits. Growth is the new limit minus main's limit, not growth
relative to this branch's old limits.

| Consumer                              | Measured gzip bytes | Main limit | Added margin | New limit | Growth over main |
| ------------------------------------- | ------------------: | ---------: | -----------: | --------: | ---------------: |
| Pre-resolved component, including Zod |              48,996 |     45,350 |        1,000 |    49,996 |            4,646 |
| Browser player                        |              14,929 |     11,883 |          447 |    15,376 |            3,493 |
| Server rendering                      |               4,229 |      4,188 |          126 |     4,355 |              167 |
| Source and resolved validation        |              27,049 |     29,638 |    Unchanged |    29,638 |                0 |
| Layout with a host-supplied engine    |              37,764 |     37,250 |        1,000 |    38,764 |            1,514 |
| Standalone checker                    |               4,701 |      6,150 |    Unchanged |     6,150 |                0 |
| Complete root API                     |              32,743 |     39,159 |    Unchanged |    39,159 |                0 |

Component and player growth covers panel rows and the independent checker;
server rendering adds numbered label rows. Layout growth covers checking SVG
arcs and node step numbers. Shared parsing and geometry are bundled once.
