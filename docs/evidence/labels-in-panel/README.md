# Arrow labels in the panel

The author approved numbered label rows beneath the step explanation at 390 px,
with whole-map labels grouped beneath each step title. Each row retains the
number of its step. The player selects this presentation only when the refined
map's quality report contains a hard arrow-label contact.

## Reproduce the browser checks

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

The original quality-baseline JSON files and resolved example hashes remain
unchanged. The checker now includes node step numbers in arrow-label contacts.
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

## Pictures

Chromium before/after pictures were captured at 1280 and 390 px in light and
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
dependency. The checker uses
its existing mono font metrics directly, avoiding unused proportional font
tables in the player. Panel derivation was separated from map geometry so the
existing complexity limits did not need increases.

| Consumer                              | Measured gzip bytes | Previous limit | Margin | New limit |
| ------------------------------------- | ------------------: | -------------: | -----: | --------: |
| Pre-resolved component, including Zod |              48,225 |         42,350 |  1,000 |    49,225 |
| Browser player                        |              14,329 |          9,883 |    429 |    14,758 |
| Server rendering                      |               4,229 |          4,188 |    126 |     4,355 |
| Layout with a host-supplied engine    |              36,803 |         36,250 |  1,000 |    37,803 |

Other size limits are unchanged. The standalone checker is 4,701 bytes gzip,
under its existing 6,150-byte limit.
